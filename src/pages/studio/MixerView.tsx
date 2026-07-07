// MixerView — Studio Mixer & Mastering (B1 Task 6).
//
// Swapped in for the timeline (Inspector + track lanes) when
// StudioEditor's `view === 'mix'`; the header/transport bar above it
// never unmounts, so playback/record/metronome all keep running while
// the user is on this screen.
//
// Layout: a horizontal, `overflow-x-auto` row of ChannelStrips (one per
// track) followed by a pinned MasterStrip. Strip internal order follows
// the touch-DAW research brief's console convention — EQ -> pan ->
// fader -> meter -> M/S/R — with the M/S/R button classNames copied
// verbatim from DarkTrackRow so the mixer's buttons look identical to
// the timeline strip's.
//
// Touch conventions (docs/research/2026-07-06-touch-daw-ux-brief.md
// "Copy" list): double-tap resets (pan -> center, fader -> 0dB) via our
// own 300ms pointer-based tap tracker (touch dblclick is unreliable);
// vertical-swipe pan knob, 100px drag = full -1..1 range; PPM peak
// meters with instantaneous attack / 20dB-per-1.7s release and a
// numeric peak-hold that resets on tap; on phones, a meter bridge sits
// above the strip row and tapping a strip opens a floating MiniFader
// (Logic-for-iPad's portrait answer) instead of cramming a full fader +
// knob into a ~90px-wide column.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X, Plus, Trash2, Download, Mic, Drum } from 'lucide-react';
import { useIsPhone } from '@/hooks/use-mobile';
import type { useStudioEngine } from '@/hooks/useStudio';
import type { EngineState } from '@/lib/studio/engine/engine';
import type { MeterBlock } from '@/lib/studio/engine/masterChain';
import {
  isAudioTrack, withMasteringDefaults,
  type Session, type Track, type TrackEqBand, type MasteringParams,
} from '@/lib/studio/session';
import { faderPosToDb, dbToFaderPos } from '@/lib/studio/dsp/faderTaper';
import { ppmDecay, servoStep } from './mixerMath';

type StripPatch = Partial<Pick<Track, 'volume_db' | 'pan' | 'mute' | 'solo'>>;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ── Log-scale slider <-> value helpers (freq 20..20k, Q 0.3..8) ───────
// Radix Slider works in a linear 0..100 domain; these map that domain
// onto the log-spaced ranges the EQ sheet needs so most of the travel
// lands in the musically useful low-to-mid region.

function logSliderToValue(pos: number, min: number, max: number): number {
  const t = clamp(pos, 0, 100) / 100;
  return min * Math.pow(max / min, t);
}
function valueToLogSlider(value: number, min: number, max: number): number {
  const v = clamp(value, min, max);
  return (Math.log(v / min) / Math.log(max / min)) * 100;
}

const FREQ_MIN = 20;
const FREQ_MAX = 20000;
const Q_MIN = 0.3;
const Q_MAX = 8;
const MAX_EQ_BANDS = 4;

function formatPan(pan: number): string {
  if (Math.abs(pan) < 0.01) return 'C';
  const pct = Math.round(Math.abs(pan) * 100);
  return pan < 0 ? `L${pct}` : `R${pct}`;
}

function formatDb(db: number): string {
  if (db === -Infinity) return '-∞';
  return `${db >= 0 ? '+' : ''}${db.toFixed(1)}`;
}

// ── Own 300ms double-tap tracker ──────────────────────────────────────
// Pointer events unify mouse + touch, but neither fires a reliable
// dblclick on touch — this tiny helper works for both. Callers pass a
// `moved` flag so a drag-release never gets mistaken for a tap.

function useTapTracker(delayMs = 300) {
  const lastTapAtRef = useRef(0);
  return useCallback((moved: boolean, onDoubleTap: () => void) => {
    if (moved) { lastTapAtRef.current = 0; return; }
    const now = performance.now();
    if (now - lastTapAtRef.current < delayMs) {
      lastTapAtRef.current = 0;
      onDoubleTap();
    } else {
      lastTapAtRef.current = now;
    }
  }, [delayMs]);
}

// ── Meter state (peak + hold) kept per strip id ("track:<id>" /
// "master") by the single rAF loop in MixerView. ─────────────────────

interface MeterEntry {
  db: number;      // current displayed (post-ballistics) level
  holdDb: number;  // peak-hold — only moves up; resets on tap
}
const EMPTY_METER: MeterEntry = { db: -Infinity, holdDb: -Infinity };

// ═══════════════════════════════════════════════════════════════════
// MixerView
// ═══════════════════════════════════════════════════════════════════

export function MixerView({
  session, update, engineState, state, onOpenExport,
}: {
  session: Session;
  update: (mut: (s: Session) => Session) => void;
  engineState: ReturnType<typeof useStudioEngine>;
  state: EngineState | null;
  /** Opens the Export sheet owned by StudioEditor (MP3 320 / WAV / Stems)
   * — the MasterStrip's Export button (Task 7) and the header's Export
   * button both drive the same sheet/state. */
  onOpenExport: () => void;
}) {
  const isPhone = useIsPhone();
  const [meters, setMeters] = useState<Record<string, MeterEntry>>({});
  const [activePhoneTrackId, setActivePhoneTrackId] = useState<string | null>(null);

  // ── Meter rAF loop — polls engineState.getTrackPeakDb per track + the
  // existing master peakDbL/R off `state`, applies PPM release
  // ballistics (attack instant, release via ppmDecay), and throttles
  // React state writes to ~30Hz (matches the engine's own emit cadence)
  // so N tracks don't repaint at 60Hz for nothing. Cancels on unmount —
  // meters do NOT run while the user is back on the timeline view.
  useEffect(() => {
    let rafId: number | null = null;
    let lastFrame = performance.now();
    let lastEmit = 0;
    const tick = (now: number) => {
      const dtSeconds = Math.max(0, (now - lastFrame) / 1000);
      lastFrame = now;
      if (now - lastEmit >= 33) {
        lastEmit = now;
        setMeters((prev) => {
          const next: Record<string, MeterEntry> = { ...prev };
          for (const t of session.tracks) {
            const raw = engineState.getTrackPeakDb(t.id);
            const prevEntry = prev[t.id] ?? EMPTY_METER;
            const decayed = ppmDecay(prevEntry.db, dtSeconds);
            const db = Math.max(raw, decayed);
            const holdDb = db > prevEntry.holdDb ? db : prevEntry.holdDb;
            next[t.id] = { db, holdDb };
          }
          // Master bus reuses the transport bar's existing peakDbL/R —
          // average L/R into a single displayed number for the strip.
          const masterRaw = Math.max(state?.peakDbL ?? -Infinity, state?.peakDbR ?? -Infinity);
          const prevMaster = prev.master ?? EMPTY_METER;
          const masterDecayed = ppmDecay(prevMaster.db, dtSeconds);
          const masterDb = Math.max(masterRaw, masterDecayed);
          next.master = { db: masterDb, holdDb: masterDb > prevMaster.holdDb ? masterDb : prevMaster.holdDb };
          return next;
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => { if (rafId !== null) cancelAnimationFrame(rafId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.tracks, engineState, state?.peakDbL, state?.peakDbR]);

  const resetHold = useCallback((id: string) => {
    setMeters((prev) => ({ ...prev, [id]: { db: prev[id]?.db ?? -Infinity, holdDb: -Infinity } }));
  }, []);

  const setStrip = useCallback((trackId: string, patch: StripPatch) => {
    update((s) => ({
      ...s,
      tracks: s.tracks.map((t) => t.id === trackId ? { ...t, ...patch } as Track : t),
    }));
    engineState.updateTrackStrip(trackId, patch);
  }, [update, engineState]);

  const setTrackEq = useCallback((trackId: string, eq: TrackEqBand[]) => {
    update((s) => ({
      ...s,
      tracks: s.tracks.map((t) => t.id === trackId ? { ...t, eq } as Track : t),
    }));
  }, [update]);

  const activePhoneTrack = activePhoneTrackId
    ? session.tracks.find((t) => t.id === activePhoneTrackId) ?? null
    : null;

  return (
    <div className="flex flex-col gap-2">
      {isPhone && (
        <MeterBridge tracks={session.tracks} meters={meters} />
      )}
      <div className="flex gap-2 items-stretch overflow-x-auto pb-1 [scrollbar-width:thin]">
        {session.tracks.length === 0 ? (
          <div className="flex-1 border border-dashed border-border rounded-md py-10 text-center text-xs text-muted-foreground">
            Add a track from the timeline view to see it in the mixer.
          </div>
        ) : session.tracks.map((t, i) => (
          <ChannelStrip
            key={t.id}
            index={i + 1}
            track={t}
            meter={meters[t.id] ?? EMPTY_METER}
            onResetHold={() => resetHold(t.id)}
            onStripChange={(p) => setStrip(t.id, p)}
            onEqChange={(eq) => setTrackEq(t.id, eq)}
            isPhone={isPhone}
            onTapPhone={() => setActivePhoneTrackId(t.id)}
          />
        ))}
        <MasterStrip session={session} update={update} state={state} meter={meters.master ?? EMPTY_METER} onResetHold={() => resetHold('master')} onExport={onOpenExport} />
      </div>
      {isPhone && activePhoneTrack && (
        <MiniFader
          track={activePhoneTrack}
          onStripChange={(p) => setStrip(activePhoneTrack.id, p)}
          onClose={() => setActivePhoneTrackId(null)}
        />
      )}
    </div>
  );
}

// ── Phone meter bridge — a compact row of per-track peak bars above the
// strip row, so a musician can see every level at a glance even when
// the strips themselves are too narrow to show a full-height meter. ──

function MeterBridge({ tracks, meters }: { tracks: Track[]; meters: Record<string, MeterEntry> }) {
  return (
    <div className="flex gap-1.5 items-end px-1 py-1 bg-card border border-border rounded-md overflow-x-auto">
      {tracks.map((t) => {
        const m = meters[t.id] ?? EMPTY_METER;
        const pct = clamp(((m.db === -Infinity ? -60 : m.db) + 60) / 60 * 100, 0, 100);
        const hot = m.db > -3;
        const warm = m.db > -12;
        return (
          <div key={t.id} className="flex flex-col items-center gap-0.5 shrink-0 w-6" title={t.name}>
            <div className="w-2 h-8 bg-muted rounded-sm overflow-hidden flex flex-col justify-end">
              <div className={`w-full transition-[height] duration-75 ${hot ? 'bg-rose-500' : warm ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ height: `${pct}%` }} />
            </div>
            <span className="w-2 h-1 rounded-full" style={{ backgroundColor: t.color }} />
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ChannelStrip
// ═══════════════════════════════════════════════════════════════════

function ChannelStrip({
  index, track, meter, onResetHold, onStripChange, onEqChange, isPhone, onTapPhone,
}: {
  index: number;
  track: Track;
  meter: MeterEntry;
  onResetHold: () => void;
  onStripChange: (p: StripPatch) => void;
  onEqChange: (eq: TrackEqBand[]) => void;
  isPhone: boolean;
  onTapPhone: () => void;
}) {
  const [eqOpen, setEqOpen] = useState(false);
  const hasEnabledBand = (track.eq ?? []).some((b) => b.enabled);

  return (
    <div className="shrink-0 w-24 sm:w-28 bg-card border border-border rounded-md flex flex-col items-center gap-1.5 p-1.5">
      {/* Name + index — tapping this row on phone opens the MiniFader
       * instead of trying to render a full fader in a 96px column. */}
      <button
        type="button"
        onClick={isPhone ? onTapPhone : undefined}
        className="w-full flex items-center gap-1 min-h-11 sm:min-h-0 text-left"
        title={track.name}
      >
        <span className="text-xs text-muted-foreground tabular-nums w-4 shrink-0 font-mono">{index}</span>
        {isAudioTrack(track) ? <Mic className="w-3.5 h-3.5 shrink-0" style={{ color: track.color }} /> : <Drum className="w-3.5 h-3.5 shrink-0" style={{ color: track.color }} />}
        <span className="text-xs font-semibold truncate flex-1 min-w-0">{track.name}</span>
      </button>

      {/* EQ disclosure chip */}
      <button
        type="button"
        onClick={() => setEqOpen(true)}
        className="w-full h-7 rounded border border-border bg-muted hover:bg-muted/70 text-xs font-semibold inline-flex items-center justify-center gap-1"
        title="Track EQ"
      >
        EQ
        {hasEnabledBand && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      </button>

      {!isPhone && (
        <>
          {/* Pan (vertical swipe, double-tap centers) + Fader + Meter */}
          <PanKnob pan={track.pan} onChange={(pan) => onStripChange({ pan })} />
          <div className="flex items-end gap-1.5 flex-1">
            <Fader volumeDb={track.volume_db} muted={track.mute} onChange={(db) => onStripChange({ volume_db: db })} />
            <PeakMeter db={meter.db} holdDb={meter.holdDb} onReset={onResetHold} />
          </div>
        </>
      )}
      {isPhone && (
        <div className="w-full flex items-center gap-1.5">
          <div className="flex-1 text-xs tabular-nums text-center text-muted-foreground">{formatDb(track.volume_db)}</div>
          <PeakMeter db={meter.db} holdDb={meter.holdDb} onReset={onResetHold} height={48} />
        </div>
      )}

      {/* M/S/R — classNames copied verbatim from DarkTrackRow (StudioEditor.tsx)
       * so the mixer's buttons look identical to the timeline strip's. */}
      <div className="flex items-center gap-1">
        <button onClick={() => onStripChange({ mute: !track.mute })}
          className={`text-sm font-bold px-1.5 py-0.5 rounded border ${track.mute ? 'bg-amber-400 border-amber-400 text-amber-950' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}>M</button>
        <button onClick={() => onStripChange({ solo: !track.solo })}
          className={`text-sm font-bold px-1.5 py-0.5 rounded border ${track.solo ? 'bg-yellow-400 border-yellow-400 text-yellow-950' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}>S</button>
      </div>

      <StripEqSheet open={eqOpen} onOpenChange={setEqOpen} track={track} onChange={onEqChange} />
    </div>
  );
}

// ── StripEqSheet — bottom sheet listing up to 4 bands ────────────────

function StripEqSheet({
  open, onOpenChange, track, onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  track: Track;
  onChange: (eq: TrackEqBand[]) => void;
}) {
  const bands = track.eq ?? [];

  const addBand = () => {
    if (bands.length >= MAX_EQ_BANDS) return;
    const band: TrackEqBand = { type: 'peaking', freq_hz: 1000, gain_db: 0, q: 1, enabled: true };
    onChange([...bands, band]);
  };
  const removeBand = (idx: number) => onChange(bands.filter((_, i) => i !== idx));
  const updateBand = (idx: number, patch: Partial<TrackEqBand>) =>
    onChange(bands.map((b, i) => i === idx ? { ...b, ...patch } : b));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{track.name} · EQ</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 text-sm pb-4">
          {bands.length === 0 && (
            <p className="text-xs text-muted-foreground">No EQ bands yet — add one below.</p>
          )}
          {bands.map((band, idx) => (
            <div key={idx} className="border border-border rounded-md p-2.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch checked={band.enabled} onCheckedChange={(v) => updateBand(idx, { enabled: v })} />
                  <Select value={band.type} onValueChange={(v) => updateBand(idx, { type: v as TrackEqBand['type'] })}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="highpass">Highpass</SelectItem>
                      <SelectItem value="lowshelf">Low shelf</SelectItem>
                      <SelectItem value="peaking">Peaking</SelectItem>
                      <SelectItem value="highshelf">High shelf</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button
                  onClick={() => removeBand(idx)}
                  className="h-8 w-8 min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 rounded flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                  aria-label="Remove band"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs w-10 text-muted-foreground">Freq</span>
                <Slider
                  value={[valueToLogSlider(band.freq_hz, FREQ_MIN, FREQ_MAX)]}
                  min={0} max={100} step={0.5}
                  onValueChange={(v) => updateBand(idx, { freq_hz: Math.round(logSliderToValue(v[0], FREQ_MIN, FREQ_MAX)) })}
                  className="flex-1"
                />
                <span className="text-xs tabular-nums w-16 text-right">{Math.round(band.freq_hz)} Hz</span>
              </div>

              {band.type !== 'highpass' && (
                <div className="flex items-center gap-3">
                  <span className="text-xs w-10 text-muted-foreground">Gain</span>
                  <Slider
                    value={[band.gain_db]} min={-12} max={12} step={0.5}
                    onValueChange={(v) => updateBand(idx, { gain_db: v[0] })}
                    className="flex-1"
                  />
                  <span className="text-xs tabular-nums w-16 text-right">{band.gain_db.toFixed(1)} dB</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="text-xs w-10 text-muted-foreground">Q</span>
                <Slider
                  value={[valueToLogSlider(band.q, Q_MIN, Q_MAX)]}
                  min={0} max={100} step={0.5}
                  onValueChange={(v) => updateBand(idx, { q: Number(logSliderToValue(v[0], Q_MIN, Q_MAX).toFixed(2)) })}
                  className="flex-1"
                />
                <span className="text-xs tabular-nums w-16 text-right">{band.q.toFixed(2)}</span>
              </div>
            </div>
          ))}
          <button
            onClick={addBand}
            disabled={bands.length >= MAX_EQ_BANDS}
            className="w-full h-11 rounded border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Add band {bands.length >= MAX_EQ_BANDS ? '(max 4)' : ''}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PanKnob — vertical-swipe drag, 100px = full -1..1 range, double-tap centers
// ═══════════════════════════════════════════════════════════════════

function PanKnob({ pan, onChange }: { pan: number; onChange: (pan: number) => void }) {
  const dragRef = useRef<{ y: number; pan: number } | null>(null);
  const movedRef = useRef(false);
  const startYRef = useRef(0);
  const tap = useTapTracker();

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { y: e.clientY, pan };
    movedRef.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dy = dragRef.current.y - e.clientY; // dragging up increases pan-right convention below
    if (Math.abs(dy) > 3) movedRef.current = true;
    // 100px drag = full range (span of 2, from -1 to 1).
    const next = clamp(dragRef.current.pan + (dy / 100) * 2, -1, 1);
    onChange(next);
  };
  const onPointerUp = () => {
    dragRef.current = null;
    tap(movedRef.current, () => onChange(0));
  };

  const angle = pan * 120; // -120deg..120deg sweep

  return (
    <div
      className="w-11 h-11 flex items-center justify-center touch-none select-none cursor-ns-resize"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      title={`Pan ${formatPan(pan)} — drag vertically, double-tap to center`}
      role="slider"
      aria-label="Pan"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={pan}
    >
      <div className="relative w-7 h-7 rounded-full bg-muted border border-border">
        <div
          className="absolute left-1/2 top-1/2 w-0.5 h-3 bg-foreground rounded-full origin-bottom"
          style={{ transform: `translate(-50%, -100%) rotate(${angle}deg)` }}
        />
      </div>
      <span className="sr-only">{formatPan(pan)}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Fader — vertical dB-taper fader, double-tap -> 0dB
// ═══════════════════════════════════════════════════════════════════

const FADER_TRACK_HEIGHT = 132;

function Fader({ volumeDb, muted, onChange }: { volumeDb: number; muted: boolean; onChange: (db: number) => void }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const startYRef = useRef(0);
  const tap = useTapTracker();
  const pos = dbToFaderPos(volumeDb);

  const posFromClientY = (clientY: number): number => {
    const el = trackRef.current;
    if (!el) return pos;
    const rect = el.getBoundingClientRect();
    const t = 1 - (clientY - rect.top) / rect.height; // top of track = 1 (loud)
    return clamp(t, 0, 1);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    movedRef.current = false;
    startYRef.current = e.clientY;
    onChange(faderPosToDb(posFromClientY(e.clientY)));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    // Same 3px slop as PanKnob: touch taps emit micro-moves; without
    // this, double-tap-to-0dB never fires on real touchscreens.
    if (Math.abs(e.clientY - startYRef.current) > 3) movedRef.current = true;
    onChange(faderPosToDb(posFromClientY(e.clientY)));
  };
  const onPointerUp = () => {
    draggingRef.current = false;
    tap(movedRef.current, () => onChange(0));
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs tabular-nums" title="Track volume">{formatDb(volumeDb)}</span>
      <div
        ref={trackRef}
        className="relative w-11 bg-muted rounded touch-none select-none"
        style={{ height: FADER_TRACK_HEIGHT }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label="Volume"
        aria-valuemin={-72}
        aria-valuemax={6}
        aria-valuenow={volumeDb === -Infinity ? -72 : volumeDb}
        title="Drag to set level, double-tap for 0dB"
      >
        {/* Unity (0dB) tick mark. */}
        <div className="absolute left-0 right-0 h-px bg-border/80" style={{ bottom: `${dbToFaderPos(0) * 100}%` }} />
        <div
          className={`absolute left-1/2 w-9 h-3.5 rounded-sm border ${muted ? 'bg-muted-foreground/40 border-muted-foreground/60' : 'bg-primary border-primary'}`}
          style={{ bottom: `${pos * 100}%`, transform: 'translate(-50%, 50%)' }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PeakMeter — PPM bar + numeric peak-hold, tap resets
// ═══════════════════════════════════════════════════════════════════

function PeakMeter({ db, holdDb, onReset, height = FADER_TRACK_HEIGHT }: {
  db: number; holdDb: number; onReset: () => void; height?: number;
}) {
  const pct = clamp(((db === -Infinity ? -60 : db) + 60) / 60 * 100, 0, 100);
  const hot = db > -3;
  const warm = db > -12;
  return (
    <button
      type="button"
      onClick={onReset}
      title="Tap to reset peak hold"
      className="flex flex-col items-center gap-0.5 justify-end px-2 py-1 min-w-11 min-h-11"
    >
      <span className="text-xs tabular-nums text-muted-foreground leading-none">
        {holdDb === -Infinity ? '—' : holdDb.toFixed(0)}
      </span>
      <div className="w-2 bg-muted rounded-sm overflow-hidden flex flex-col justify-end" style={{ height }}>
        <div className={`w-full transition-[height] duration-75 ${hot ? 'bg-rose-500' : warm ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ height: `${pct}%` }} />
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MiniFader — floating bottom card for phones (Logic-for-iPad's
// portrait answer: tap a strip, get vol/pan/M/S as an overlay).
// ═══════════════════════════════════════════════════════════════════

function MiniFader({ track, onStripChange, onClose }: {
  track: Track;
  onStripChange: (p: StripPatch) => void;
  onClose: () => void;
}) {
  const volTap = useTapTracker();
  const panTap = useTapTracker();
  return (
    <div className="fixed left-2 right-2 bottom-2 z-50 bg-card border border-border rounded-xl shadow-xl p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{track.name}</div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-muted-foreground w-8">Vol</span>
          <input
            type="range" min={-40} max={6} step={0.5} value={track.volume_db === -Infinity ? -40 : track.volume_db}
            onChange={(e) => onStripChange({ volume_db: Number(e.target.value) })}
            // Touch has no reliable dblclick on range inputs — use the
            // same 300ms tracker as Fader/PanKnob (see header comment).
            onPointerUp={() => volTap(false, () => onStripChange({ volume_db: 0 }))}
            className="flex-1 h-2 accent-primary min-w-0"
          />
          <span className="text-xs tabular-nums w-12 text-right">{formatDb(track.volume_db)}</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-muted-foreground w-8">Pan</span>
          <input
            type="range" min={-1} max={1} step={0.05} value={track.pan}
            onChange={(e) => onStripChange({ pan: Number(e.target.value) })}
            onPointerUp={() => panTap(false, () => onStripChange({ pan: 0 }))}
            className="flex-1 h-2 accent-primary min-w-0"
          />
          <span className="text-xs tabular-nums w-12 text-right">{formatPan(track.pan)}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <button onClick={() => onStripChange({ mute: !track.mute })}
          className={`h-11 w-11 text-sm font-bold rounded border ${track.mute ? 'bg-amber-400 border-amber-400 text-amber-950' : 'bg-muted border-border text-muted-foreground'}`}>M</button>
        <button onClick={() => onStripChange({ solo: !track.solo })}
          className={`h-11 w-11 text-sm font-bold rounded border ${track.solo ? 'bg-yellow-400 border-yellow-400 text-yellow-950' : 'bg-muted border-border text-muted-foreground'}`}>S</button>
      </div>
      <button onClick={onClose} aria-label="Close" className="h-11 w-11 -mr-1 rounded flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MasterStrip — mastering enable, HPF/air/comp/ceiling, loudness servo,
// LUFS M/S/I + peak readouts, Export (opens the StudioEditor Export
// sheet — MP3 320 / WAV / Stems, Task 7).
// ═══════════════════════════════════════════════════════════════════

const SERVO_INTERVAL_MS = 3000;

function MasterStrip({
  session, update, state, meter, onResetHold, onExport,
}: {
  session: Session;
  update: (mut: (s: Session) => Session) => void;
  state: EngineState | null;
  meter: MeterEntry;
  onResetHold: () => void;
  onExport: () => void;
}) {
  const mastering = useMemo(() => withMasteringDefaults(session).master.mastering!, [session]);
  const [servoEngaged, setServoEngaged] = useState(false);
  const [block, setBlock] = useState<MeterBlock | null>(null);
  const integratedRef = useRef(-Infinity);
  const preGainRef = useRef(0);

  // Subscribe to the live mastering chain's loudness meter whenever a
  // built chain is available (mastering enabled + async worklet build
  // resolved). Unsubscribes on chain replacement/unmount automatically.
  useEffect(() => {
    const chain = state?.masterChain;
    if (!chain) { setBlock(null); return; }
    const unsub = chain.meter.onBlock((m) => {
      integratedRef.current = m.integrated;
      setBlock(m);
    });
    return unsub;
  }, [state?.masterChain]);

  // Loudness servo — every 3s while engaged, nudge the master chain's
  // pre-limiter makeup gain toward the target LUFS. The AudioParam
  // write itself is guarded engine-side (StudioEngine.setMasterPreGainDb
  // no-ops while recording-armed — B1 spec §5), but that alone isn't
  // enough: `preGainRef` is UI-side state, and servoStep's own math
  // folds it forward every tick regardless of whether the write landed.
  // Left unguarded here, several armed ticks would advance the ref well
  // past the actual (frozen) live gain, and disarming would apply that
  // drifted value in one jump — audible exactly when the guard above
  // was supposed to prevent it. So: skip the tick ENTIRELY (no ref
  // advance, no write) while armed, not just the write.
  useEffect(() => {
    if (!servoEngaged) return;
    const id = setInterval(() => {
      const chain = state?.masterChain;
      if (!chain || !state?.isPlaying || state?.recordingActive) return;
      const next = servoStep(preGainRef.current, integratedRef.current, mastering.loudness_target_lufs);
      preGainRef.current = next;
      chain.setPreGainDb(next);
    }, SERVO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [servoEngaged, state?.masterChain, state?.isPlaying, state?.recordingActive, mastering.loudness_target_lufs]);

  const updateMastering = useCallback((patch: Partial<MasteringParams>) => update((s) => {
    const base = withMasteringDefaults(s).master.mastering!;
    return { ...s, master: { ...s.master, mastering: { ...base, ...patch } } };
  }), [update]);
  const updateComp = useCallback((patch: Partial<MasteringParams['comp']>) => update((s) => {
    const base = withMasteringDefaults(s).master.mastering!;
    return { ...s, master: { ...s.master, mastering: { ...base, comp: { ...base.comp, ...patch } } } };
  }), [update]);
  const updateLimiter = useCallback((patch: Partial<MasteringParams['limiter']>) => update((s) => {
    const base = withMasteringDefaults(s).master.mastering!;
    return { ...s, master: { ...s.master, mastering: { ...base, limiter: { ...base.limiter, ...patch } } } };
  }), [update]);

  const toggleServo = () => {
    if (!servoEngaged) preGainRef.current = 0; // fresh engage starts from unity
    setServoEngaged(!servoEngaged);
  };

  const integratedOverTarget = block && block.integrated > mastering.loudness_target_lufs + 0.5;

  return (
    <div className="shrink-0 w-40 sm:w-48 bg-card border border-border rounded-md flex flex-col gap-2 p-2 sticky right-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Master</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Master</span>
          <Switch checked={mastering.enabled} onCheckedChange={(v) => updateMastering({ enabled: v })} />
        </div>
      </div>

      {/* Mastering-applied badge — mirrors the switch above; also shown
       * in the Export sheet itself so it's clear whether an export will
       * run through the mastering chain (Task 7). */}
      <div
        className={`text-center text-xs font-semibold rounded border py-0.5 ${
          mastering.enabled
            ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400'
            : 'bg-muted border-border text-muted-foreground'
        }`}
      >
        {mastering.enabled ? 'Mastering applied' : 'No mastering'}
      </div>

      <div className="space-y-1.5">
        <LabeledSlider label="HPF" value={mastering.hpf_hz} min={20} max={120} step={1} unit="Hz"
          onChange={(v) => updateMastering({ hpf_hz: v })} />
        <LabeledSlider label="Air" value={mastering.air_gain_db} min={0} max={4} step={0.1} unit="dB"
          onChange={(v) => updateMastering({ air_gain_db: v })} />
        <LabeledSlider label="Comp thr" value={mastering.comp.threshold_db} min={-30} max={-6} step={0.5} unit="dB"
          onChange={(v) => updateComp({ threshold_db: v })} />
        <LabeledSlider label="Comp ratio" value={mastering.comp.ratio} min={1} max={4} step={0.1} unit=":1"
          onChange={(v) => updateComp({ ratio: v })} />
        <LabeledSlider label="Ceiling" value={mastering.limiter.ceiling_db} min={-3} max={-0.5} step={0.1} unit="dB"
          onChange={(v) => updateLimiter({ ceiling_db: v })} />
      </div>

      {/* Loudness knob + streaming-master servo engage */}
      <div className="border-t border-border pt-1.5 space-y-1.5">
        <LabeledSlider label="Target" value={mastering.loudness_target_lufs} min={-16} max={-9} step={0.5} unit=" LUFS"
          onChange={(v) => updateMastering({ loudness_target_lufs: v })} />
        <button
          onClick={toggleServo}
          className={`w-full h-9 rounded border text-xs font-semibold ${servoEngaged ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}
          title="Nudges master gain toward the target LUFS every 3s while playing"
        >
          {servoEngaged ? 'Mastering for streaming…' : 'Master for streaming'}
        </button>
      </div>

      {/* LUFS M/S/I + peak readouts */}
      <div className="border-t border-border pt-1.5 grid grid-cols-3 gap-1 text-center">
        <div>
          <div className="text-xs text-muted-foreground">M</div>
          <div className="text-xs tabular-nums">{block ? block.momentary.toFixed(1) : '—'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">S</div>
          <div className="text-xs tabular-nums">{block ? block.shortTerm.toFixed(1) : '—'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">I</div>
          <div className={`text-xs tabular-nums ${integratedOverTarget ? 'text-amber-500 font-semibold' : ''}`}>
            {block ? block.integrated.toFixed(1) : '—'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <span className="text-xs text-muted-foreground">Peak {block ? `${block.peakDb.toFixed(1)}dB` : '—'}</span>
        <PeakMeter db={meter.db} holdDb={meter.holdDb} onReset={onResetHold} height={64} />
      </div>

      <button
        onClick={onExport}
        title="Export MP3 320 / WAV / stems"
        className="w-full h-9 rounded border border-border text-foreground hover:bg-muted/70 inline-flex items-center justify-center gap-1.5 text-xs font-semibold"
      >
        <Download className="w-3.5 h-3.5" /> Export
      </button>
    </div>
  );
}

function LabeledSlider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs w-14 text-muted-foreground shrink-0">{label}</span>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className="flex-1" />
      <span className="text-xs tabular-nums w-12 text-right shrink-0">{value.toFixed(1)}{unit}</span>
    </div>
  );
}
