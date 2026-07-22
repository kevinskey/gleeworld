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
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X, Plus, Trash2, Download, Mic, Drum, Route } from 'lucide-react';
import { useIsPhone } from '@/hooks/use-mobile';
import type { useStudioEngine } from '@/hooks/useStudio';
import type { EngineState } from '@/lib/studio/engine/engine';
import type { MeterBlock } from '@/lib/studio/engine/masterChain';
import {
  isAudioTrack, withMasteringDefaults, MASTER_BUS_ID, MAX_BUSES, MAX_SENDS_PER_TRACK,
  type Session, type Track, type TrackEqBand, type MasteringParams,
  type Bus, type Send, type FxNode, type Automation, type AutomationParam,
} from '@/lib/studio/session';
import { writeAutomationPoint } from '@/lib/studio/automation';
import { newBus } from '@/lib/studio/defaults';
import { wouldEditCycle, formatCycle, type RoutingEdge } from '@/lib/studio/routingGraph';
import { toast } from 'sonner';
import { InsertRack } from './InsertRack';
import { AutomationPanel } from './AutomationPanel';
import { faderPosToDb, dbToFaderPos } from '@/lib/studio/dsp/faderTaper';
import { ppmDecay, servoStep } from './mixerMath';

type StripPatch = Partial<Pick<Track, 'volume_db' | 'pan' | 'mute' | 'solo'>>;

/** Stable key for one (kind, id, param) envelope — must match the
 *  string the engine builds in envelopeKey() so the touched/latched
 *  sets stay in sync across boundaries. */
function envelopeKey(kind: 'track' | 'bus', id: string, param: AutomationParam): string {
  return `${kind}:${id}:${param}`;
}

/** Punch-write any envelope for this strip whose mode allows capture
 *  right now, using the incoming patch's volume_db / pan values, at the
 *  current transport position. Returns the possibly-updated automation
 *  array. Callers pass it back into session.automation so live moves
 *  persist as breakpoints while transport is playing.
 *
 *  Which modes capture:
 *    - 'write' — every move captures.
 *    - 'touch' — captures only while the user is touching the control.
 *    - 'latch' — captures on first touch and stays capturing until the
 *                transport stops (latched cleared elsewhere).
 *
 *  Silent no-op when transport is not playing, when no matching
 *  envelope exists, or when the patch touches only mute/solo. */
export function captureWriteModeAutomation(
  automation: Automation[],
  ownerId: string,
  ownerKind: 'track' | 'bus',
  patch: StripPatch,
  transport: { isPlaying: boolean; positionSeconds: number },
  touched: ReadonlySet<string> = new Set(),
  latched: ReadonlySet<string> = new Set(),
): Automation[] {
  if (!transport.isPlaying) return automation;
  const paramValue: Partial<Record<AutomationParam, number>> = {};
  if (patch.volume_db !== undefined) paramValue.volume_db = patch.volume_db;
  if (patch.pan !== undefined) paramValue.pan = patch.pan;
  const paramsToWrite = Object.keys(paramValue) as AutomationParam[];
  if (paramsToWrite.length === 0) return automation;

  let next = automation;
  for (const param of paramsToWrite) {
    const idx = next.findIndex(
      (a) => a.target_id === ownerId && a.target_kind === ownerKind && a.param === param,
    );
    if (idx < 0) continue;
    const env = next[idx];
    const key = envelopeKey(ownerKind, ownerId, param);
    const shouldCapture =
      env.mode === 'write' ||
      (env.mode === 'touch' && touched.has(key)) ||
      (env.mode === 'latch' && (touched.has(key) || latched.has(key)));
    if (!shouldCapture) continue;
    const points = writeAutomationPoint(
      env.points, transport.positionSeconds, paramValue[param]!,
    );
    // Only allocate a new array when we actually mutate — cheaper for
    // the common no-op case (env exists but wrong mode).
    if (next === automation) next = [...automation];
    next[idx] = { ...env, points };
  }
  return next;
}

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
  /** Post-ballistics displayed level per channel (L / R). Kept
   *  independent so a hard-panned track shows a lone bar instead of
   *  averaging into a false middle reading. */
  dbL: number;
  dbR: number;
  /** Peak-hold per channel — only moves up; resets on tap. */
  holdL: number;
  holdR: number;
  /** Latches true once EITHER channel crosses 0 dBFS. */
  clip: boolean;
}
const EMPTY_METER: MeterEntry = {
  dbL: -Infinity, dbR: -Infinity, holdL: -Infinity, holdR: -Infinity, clip: false,
};

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

  // Ref mirror of transport state so Write-mode capture in setStrip /
  // setBusStrip can read positionSeconds + isPlaying without adding
  // them to useCallback deps (they emit ~30Hz and would thrash the
  // ChannelStrip's memoization otherwise).
  const transportRef = useRef<{ isPlaying: boolean; positionSeconds: number }>({
    isPlaying: false, positionSeconds: 0,
  });
  useEffect(() => {
    transportRef.current = {
      isPlaying: !!state?.isPlaying,
      positionSeconds: state?.positionSeconds ?? 0,
    };
  }, [state?.isPlaying, state?.positionSeconds]);

  // Automation touch/latch state — refs (not state) so a pointer-down
  // during a fader drag doesn't blow up ChannelStrip's memo. `touched`
  // is the set of currently-held envelopes; `latched` is envelopes that
  // have been touched at least once while in latch mode and continue
  // capturing after release, until transport stops.
  const touchedEnvelopesRef = useRef<Set<string>>(new Set());
  const latchedEnvelopesRef = useRef<Set<string>>(new Set());
  // Clear latched on transport stop — Logic behavior: latch releases at
  // stop, so the next Play starts from Read again.
  useEffect(() => {
    if (!state?.isPlaying) latchedEnvelopesRef.current.clear();
  }, [state?.isPlaying]);

  const touchAutomation = useCallback(
    (kind: 'track' | 'bus', id: string, param: AutomationParam) => {
      const key = envelopeKey(kind, id, param);
      touchedEnvelopesRef.current.add(key);
      // If the matching envelope is in latch mode, remember it — it
      // will keep capturing after release until transport stops.
      const auto = (session.automation ?? []).find(
        (a) => a.target_id === id && a.target_kind === kind && a.param === param,
      );
      if (auto?.mode === 'latch') latchedEnvelopesRef.current.add(key);
      engineState.touchAutomation?.(kind, id, param);
    },
    [engineState, session.automation],
  );
  const releaseAutomation = useCallback(
    (kind: 'track' | 'bus', id: string, param: AutomationParam) => {
      const key = envelopeKey(kind, id, param);
      touchedEnvelopesRef.current.delete(key);
      // On release, if the envelope is still latching, keep the engine
      // in "touched" (skip ramps) so the fader stays in control. When
      // the envelope is NOT in latch, tell the engine to resume ramps.
      if (!latchedEnvelopesRef.current.has(key)) {
        engineState.releaseAutomation?.(kind, id, param);
      }
    },
    [engineState],
  );
  // Which track's EQ editor is docked open below the strips. Previously
  // a portaled bottom Sheet — it escaped the Studio's `.dark` container
  // (rendered LIGHT) and modally dimmed the whole app; Kevin: "should
  // open in studio, not full screen".
  const [eqTrackId, setEqTrackId] = useState<string | null>(null);
  // v2.0.0: sends panel docked the same way — one open at a time.
  const [sendsTrackId, setSendsTrackId] = useState<string | null>(null);
  // Phase 5: inserts panel — one open at a time. Discriminated union
  // so the panel can host any strip's fx array.
  const [fxTarget, setFxTarget] = useState<{ kind: 'track' | 'bus'; id: string } | null>(null);
  // Phase 8b: automation panel target.
  const [autoTarget, setAutoTarget] = useState<{ kind: 'track' | 'bus'; id: string } | null>(null);

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
          const applyStereo = (
            id: string,
            raw: { L: number; R: number },
          ) => {
            const prevEntry = prev[id] ?? EMPTY_METER;
            const decayedL = ppmDecay(prevEntry.dbL, dtSeconds);
            const decayedR = ppmDecay(prevEntry.dbR, dtSeconds);
            const dbL = Math.max(raw.L, decayedL);
            const dbR = Math.max(raw.R, decayedR);
            next[id] = {
              dbL,
              dbR,
              holdL: dbL > prevEntry.holdL ? dbL : prevEntry.holdL,
              holdR: dbR > prevEntry.holdR ? dbR : prevEntry.holdR,
              clip: prevEntry.clip || raw.L > 0 || raw.R > 0,
            };
          };
          for (const t of session.tracks) {
            applyStereo(t.id, engineState.getTrackPeakDbStereo?.(t.id) ?? { L: -Infinity, R: -Infinity });
          }
          // Phase 6: same read path for user buses.
          for (const b of session.buses ?? []) {
            applyStereo(b.id, engineState.getBusPeakDbStereo?.(b.id) ?? { L: -Infinity, R: -Infinity });
          }
          // Master reuses the engine's existing peakDbL/R (already
          // stereo since the mastering chain reports both sides).
          applyStereo('master', {
            L: state?.peakDbL ?? -Infinity,
            R: state?.peakDbR ?? -Infinity,
          });
          return next;
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => { if (rafId !== null) cancelAnimationFrame(rafId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.tracks, session.buses, engineState, state?.peakDbL, state?.peakDbR]);

  const resetHold = useCallback((id: string) => {
    setMeters((prev) => {
      const p = prev[id] ?? EMPTY_METER;
      return {
        ...prev,
        [id]: { dbL: p.dbL, dbR: p.dbR, holdL: -Infinity, holdR: -Infinity, clip: false },
      };
    });
  }, []);

  const setStrip = useCallback((trackId: string, patch: StripPatch) => {
    update((s) => {
      const tracks = s.tracks.map((t) => t.id === trackId ? { ...t, ...patch } as Track : t);
      const automation = captureWriteModeAutomation(
        s.automation ?? [], trackId, 'track', patch, transportRef.current,
        touchedEnvelopesRef.current, latchedEnvelopesRef.current,
      );
      return { ...s, tracks, automation };
    });
    engineState.updateTrackStrip(trackId, patch);
  }, [update, engineState]);

  const setTrackEq = useCallback((trackId: string, eq: TrackEqBand[]) => {
    update((s) => ({
      ...s,
      tracks: s.tracks.map((t) => t.id === trackId ? { ...t, eq } as Track : t),
    }));
  }, [update]);

  // v2.0.0: bus lifecycle + routing edits.
  const setBusStrip = useCallback((busId: string, patch: StripPatch) => {
    update((s) => {
      const buses = (s.buses ?? []).map((b) => b.id === busId ? { ...b, ...patch } as Bus : b);
      const automation = captureWriteModeAutomation(
        s.automation ?? [], busId, 'bus', patch, transportRef.current,
        touchedEnvelopesRef.current, latchedEnvelopesRef.current,
      );
      return { ...s, buses, automation };
    });
    // Live engine ramp — bus strip fields are deliberately excluded
    // from the skeleton so a fader drag doesn't trigger a full reload.
    engineState.updateBusStrip?.(busId, patch);
  }, [update, engineState]);

  const addBusHandler = useCallback((name?: string) => {
    const list = session.buses ?? [];
    if (list.length >= MAX_BUSES) return; // cap enforced by validate too
    const bus = newBus(name ?? `Bus ${list.length + 1}`);
    update((s) => ({ ...s, buses: [...(s.buses ?? []), bus] }));
  }, [session.buses, update]);

  const removeBusHandler = useCallback((busId: string) => {
    update((s) => ({
      ...s,
      buses: (s.buses ?? []).filter((b) => b.id !== busId),
      // Retarget any track routed to this bus back to master so the
      // reload path leaves them audible.
      tracks: s.tracks.map((t) =>
        t.output?.bus_id === busId
          ? ({ ...t, output: { bus_id: MASTER_BUS_ID } } as Track)
          : t),
    }));
  }, [update]);

  const setTrackOutput = useCallback((trackId: string, busId: string) => {
    update((s) => ({
      ...s,
      tracks: s.tracks.map((t) =>
        t.id === trackId ? ({ ...t, output: { bus_id: busId } } as Track) : t),
    }));
  }, [update]);

  // v2.0.0 bus routing (Phase 4c) — with cycle validation. Rejects the
  // edit (with a toast) if it would introduce bus1 → bus2 → bus1 or
  // similar; otherwise updates session state, which triggers the
  // skeleton-diff reload that rewires the graph.
  const setBusOutput = useCallback((busId: string, targetBusId: string) => {
    const edges: RoutingEdge[] = (session.buses ?? []).map((b) => ({
      from: b.id, to: b.output.bus_id,
    }));
    const check = wouldEditCycle(edges, { from: busId, to: targetBusId });
    if (!check.ok) {
      toast.error('Cannot route: would create a cycle', {
        description: formatCycle(check.cycle),
      });
      return;
    }
    update((s) => ({
      ...s,
      buses: (s.buses ?? []).map((b) => b.id === busId
        ? ({ ...b, output: { bus_id: targetBusId } } as Bus)
        : b),
    }));
  }, [session.buses, update]);

  // v2.0.0 sends. Structural changes (add/remove/target/pre-post/enabled)
  // fall through the skeleton-diff reload. Level drags stay live via
  // engineState.updateSendLevel.
  const setSendLevel = useCallback((trackId: string, sendId: string, levelDb: number) => {
    update((s) => ({
      ...s,
      tracks: s.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const sends = (t.sends ?? []).map((snd) => snd.id === sendId ? { ...snd, level_db: levelDb } : snd);
        return { ...t, sends } as Track;
      }),
    }));
    engineState.updateSendLevel?.(trackId, sendId, levelDb);
  }, [update, engineState]);

  const setSendField = useCallback((trackId: string, sendId: string, patch: Partial<Send>) => {
    update((s) => ({
      ...s,
      tracks: s.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const sends = (t.sends ?? []).map((snd) => snd.id === sendId ? { ...snd, ...patch } : snd);
        return { ...t, sends } as Track;
      }),
    }));
  }, [update]);

  const addSend = useCallback((trackId: string, targetBusId: string) => {
    update((s) => ({
      ...s,
      tracks: s.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const current = t.sends ?? [];
        if (current.length >= MAX_SENDS_PER_TRACK) return t;
        const send: Send = {
          id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
            ? crypto.randomUUID()
            : `snd-${Math.random().toString(36).slice(2)}`,
          target_bus_id: targetBusId,
          level_db: -6,
          enabled: true,
          pre_fader: false,
        };
        return { ...t, sends: [...current, send] } as Track;
      }),
    }));
  }, [update]);

  // Phase 5: full fx array replace — the InsertRack component owns
  // add/remove/reorder/enable/param mutations and hands us a fresh
  // array. Skeleton includes fx so the reload path rebuilds the
  // chain; live param updates go through the same reload today
  // (bypass-live is Phase 5b).
  const setTrackFx = useCallback((trackId: string, fx: FxNode[]) => {
    update((s) => ({
      ...s,
      tracks: s.tracks.map((t) => t.id === trackId ? ({ ...t, fx } as Track) : t),
    }));
  }, [update]);

  const setBusFx = useCallback((busId: string, fx: FxNode[]) => {
    update((s) => ({
      ...s,
      buses: (s.buses ?? []).map((b) => b.id === busId ? ({ ...b, fx } as Bus) : b),
    }));
  }, [update]);

  // Phase 8b: replace the whole session.automation array. AutomationPanel
  // owns per-envelope mutations and hands us a fresh array back —
  // engine.applyAutomation() re-schedules on every play().
  const setAutomation = useCallback((next: Automation[]) => {
    update((s) => ({ ...s, automation: next }));
  }, [update]);

  const removeSend = useCallback((trackId: string, sendId: string) => {
    update((s) => ({
      ...s,
      tracks: s.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return { ...t, sends: (t.sends ?? []).filter((snd) => snd.id !== sendId) } as Track;
      }),
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
            buses={session.buses ?? []}
            meter={meters[t.id] ?? EMPTY_METER}
            onResetHold={() => resetHold(t.id)}
            onStripChange={(p) => setStrip(t.id, p)}
            onOutputChange={(busId) => setTrackOutput(t.id, busId)}
            eqOpen={eqTrackId === t.id}
            onToggleEq={() => setEqTrackId(eqTrackId === t.id ? null : t.id)}
            sendsOpen={sendsTrackId === t.id}
            onToggleSends={() => setSendsTrackId(sendsTrackId === t.id ? null : t.id)}
            fxOpen={fxTarget?.kind === 'track' && fxTarget.id === t.id}
            onToggleFx={() => setFxTarget(
              fxTarget?.kind === 'track' && fxTarget.id === t.id ? null : { kind: 'track', id: t.id }
            )}
            autoOpen={autoTarget?.kind === 'track' && autoTarget.id === t.id}
            onToggleAuto={() => setAutoTarget(
              autoTarget?.kind === 'track' && autoTarget.id === t.id ? null : { kind: 'track', id: t.id }
            )}
            automation={session.automation ?? []}
            isPhone={isPhone}
            onTapPhone={() => setActivePhoneTrackId(t.id)}
            onTouchParam={(param) => touchAutomation('track', t.id, param)}
            onReleaseParam={(param) => releaseAutomation('track', t.id, param)}
          />
        ))}
        {/* v2.0.0 — user buses. Sit between the last track and master
         *  so the signal flow reads left→right (source → bus → master). */}
        {(session.buses ?? []).map((b) => (
          <BusStrip
            key={b.id}
            bus={b}
            /** Every OTHER user bus is a valid downstream target (plus
             *  master, which is always). Bus can't route to itself —
             *  the cycle check would reject that anyway; the dropdown
             *  filters it out for clarity. */
            downstreamBuses={(session.buses ?? []).filter((other) => other.id !== b.id)}
            meter={meters[b.id] ?? EMPTY_METER}
            onResetHold={() => resetHold(b.id)}
            onStripChange={(p) => setBusStrip(b.id, p)}
            onOutputChange={(targetBusId) => setBusOutput(b.id, targetBusId)}
            onRemove={() => removeBusHandler(b.id)}
            fxOpen={fxTarget?.kind === 'bus' && fxTarget.id === b.id}
            onToggleFx={() => setFxTarget(
              fxTarget?.kind === 'bus' && fxTarget.id === b.id ? null : { kind: 'bus', id: b.id }
            )}
            autoOpen={autoTarget?.kind === 'bus' && autoTarget.id === b.id}
            onToggleAuto={() => setAutoTarget(
              autoTarget?.kind === 'bus' && autoTarget.id === b.id ? null : { kind: 'bus', id: b.id }
            )}
            automation={session.automation ?? []}
            onTouchParam={(param) => touchAutomation('bus', b.id, param)}
            onReleaseParam={(param) => releaseAutomation('bus', b.id, param)}
          />
        ))}
        <AddBusTile
          disabled={(session.buses ?? []).length >= MAX_BUSES}
          onClick={() => addBusHandler()}
        />
        <MasterStrip session={session} update={update} state={state} meter={meters.master ?? EMPTY_METER} onResetHold={() => resetHold('master')} onExport={onOpenExport} />
      </div>
      {(() => {
        const eqTrack = eqTrackId ? session.tracks.find((t) => t.id === eqTrackId) ?? null : null;
        return eqTrack && (
          <TrackEqPanel
            track={eqTrack}
            onChange={(eq) => setTrackEq(eqTrack.id, eq)}
            onClose={() => setEqTrackId(null)}
          />
        );
      })()}
      {(() => {
        const sendsTrack = sendsTrackId ? session.tracks.find((t) => t.id === sendsTrackId) ?? null : null;
        return sendsTrack && (
          <SendsPanel
            track={sendsTrack}
            buses={session.buses ?? []}
            onAdd={(targetBusId) => addSend(sendsTrack.id, targetBusId)}
            onRemove={(sendId) => removeSend(sendsTrack.id, sendId)}
            onLevelChange={(sendId, db) => setSendLevel(sendsTrack.id, sendId, db)}
            onFieldChange={(sendId, patch) => setSendField(sendsTrack.id, sendId, patch)}
            onClose={() => setSendsTrackId(null)}
          />
        );
      })()}
      {(() => {
        if (!fxTarget) return null;
        if (fxTarget.kind === 'track') {
          const t = session.tracks.find((x) => x.id === fxTarget.id);
          if (!t) return null;
          return (
            <InsertRack
              fx={t.fx}
              ownerLabel={t.name}
              onChange={(fx) => setTrackFx(t.id, fx)}
              onClose={() => setFxTarget(null)}
            />
          );
        }
        const b = (session.buses ?? []).find((x) => x.id === fxTarget.id);
        if (!b) return null;
        return (
          <InsertRack
            fx={b.fx}
            ownerLabel={b.name}
            onChange={(fx) => setBusFx(b.id, fx)}
            onClose={() => setFxTarget(null)}
          />
        );
      })()}
      {(() => {
        if (!autoTarget) return null;
        const label = autoTarget.kind === 'track'
          ? session.tracks.find((x) => x.id === autoTarget.id)?.name
          : (session.buses ?? []).find((x) => x.id === autoTarget.id)?.name;
        if (!label) return null;
        return (
          <AutomationPanel
            ownerId={autoTarget.id}
            ownerKind={autoTarget.kind}
            ownerLabel={label}
            automation={session.automation ?? []}
            playheadSeconds={state?.positionSeconds ?? 0}
            sessionLengthSeconds={session.length_seconds}
            currentStripValue={(param: AutomationParam) => {
              const strip = autoTarget.kind === 'track'
                ? session.tracks.find((x) => x.id === autoTarget.id)
                : (session.buses ?? []).find((x) => x.id === autoTarget.id);
              if (!strip) return 0;
              return param === 'volume_db' ? strip.volume_db : strip.pan;
            }}
            onChange={setAutomation}
            onClose={() => setAutoTarget(null)}
          />
        );
      })()}
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
        // Compact phone bridge shows max(L, R) as one bar — full stereo
        // rendering is on the docked ChannelStrip meter.
        const db = Math.max(m.dbL, m.dbR);
        const pct = clamp(((db === -Infinity ? -60 : db) + 60) / 60 * 100, 0, 100);
        const hot = db > -3;
        const warm = db > -12;
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
  index, track, buses, meter, onResetHold, onStripChange, onOutputChange, eqOpen, onToggleEq, sendsOpen, onToggleSends, fxOpen, onToggleFx, autoOpen, onToggleAuto, automation, isPhone, onTapPhone, onTouchParam, onReleaseParam,
}: {
  index: number;
  track: Track;
  /** v2.0.0 — user buses the track can output to (master is always
   *  available as an option even when this array is empty). */
  buses: Bus[];
  meter: MeterEntry;
  onResetHold: () => void;
  onStripChange: (p: StripPatch) => void;
  onOutputChange: (busId: string) => void;
  /** Whether this strip's EQ panel is the one docked open below. */
  eqOpen: boolean;
  onToggleEq: () => void;
  /** Whether this strip's Sends panel is the one docked open below. */
  sendsOpen: boolean;
  onToggleSends: () => void;
  /** Phase 5 — insert rack panel state. */
  fxOpen: boolean;
  onToggleFx: () => void;
  /** Phase 8b — automation panel state. */
  autoOpen: boolean;
  onToggleAuto: () => void;
  /** Session automation array — used to count read-mode envelopes for
   *  the chip badge. */
  automation: Automation[];
  isPhone: boolean;
  onTapPhone: () => void;
  /** Touch/Latch signals — Fader pointer-down / PanKnob pointer-down
   *  routes here so the mixer can add this envelope to its touched
   *  set. Release is fired on pointer-up / cancel. */
  onTouchParam: (param: AutomationParam) => void;
  onReleaseParam: (param: AutomationParam) => void;
}) {
  const hasEnabledBand = (track.eq ?? []).some((b) => b.enabled);
  const outputBusId = track.output?.bus_id ?? MASTER_BUS_ID;
  const enabledSendCount = (track.sends ?? []).filter((s) => s.enabled).length;
  const enabledFxCount = track.fx.filter((f) => f.enabled).length;
  const activeAutoCount = automation.filter(
    (a) => a.target_id === track.id && a.target_kind === 'track' && (a.mode === 'read' || a.mode === 'touch' || a.mode === 'latch') && a.points.length > 0,
  ).length;

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

      {/* EQ disclosure chip — toggles the docked EQ panel below the strips. */}
      <button
        type="button"
        onClick={onToggleEq}
        className={`w-full h-7 rounded border text-xs font-semibold inline-flex items-center justify-center gap-1 ${
          eqOpen ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted hover:bg-muted/70'}`}
        title="Track EQ"
      >
        EQ
        {hasEnabledBand && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      </button>

      {/* Phase 5 — Inserts (FX) chip. Opens the docked InsertRack. */}
      <button
        type="button"
        onClick={onToggleFx}
        className={`w-full h-7 rounded border text-[11px] font-semibold inline-flex items-center justify-center gap-1 ${
          fxOpen ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted hover:bg-muted/70'}`}
        title="Inserts (FX)"
      >
        FX
        {enabledFxCount > 0 && (
          <span className="text-[10px] px-1 rounded-full bg-emerald-500/25 text-emerald-300 tabular-nums">{enabledFxCount}</span>
        )}
      </button>

      {/* Phase 8b — Automation chip. Opens the docked AutomationPanel. */}
      <button
        type="button"
        onClick={onToggleAuto}
        className={`w-full h-7 rounded border text-[11px] font-semibold inline-flex items-center justify-center gap-1 ${
          autoOpen ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted hover:bg-muted/70'}`}
        title="Automation"
      >
        Auto
        {activeAutoCount > 0 && (
          <span className="text-[10px] px-1 rounded-full bg-emerald-500/25 text-emerald-300 tabular-nums">{activeAutoCount}</span>
        )}
      </button>

      {/* v2.0.0 — output bus selector. Compact select; shows "→ Master"
       *  by default. Only rendered when there's at least one user bus to
       *  route to, otherwise it's clutter for the common single-master
       *  case. */}
      {buses.length > 0 && (
        <OutputSelector
          buses={buses}
          value={outputBusId}
          onChange={onOutputChange}
        />
      )}

      {/* v2.0.0 — Sends chip, opens the docked SendsPanel. Only shown
       *  when the session has at least one bus to send TO (otherwise
       *  the panel would just be an empty Add-send button). */}
      {buses.length > 0 && (
        <button
          type="button"
          onClick={onToggleSends}
          className={`w-full h-7 rounded border text-[11px] font-semibold inline-flex items-center justify-center gap-1 ${
            sendsOpen ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted hover:bg-muted/70'}`}
          title="Sends"
        >
          Sends
          {enabledSendCount > 0 && (
            <span className="text-[10px] px-1 rounded-full bg-emerald-500/25 text-emerald-300 tabular-nums">{enabledSendCount}</span>
          )}
        </button>
      )}

      {!isPhone && (
        <>
          {/* Pan (vertical swipe, double-tap centers) + Fader + Meter */}
          <PanKnob
            pan={track.pan}
            onChange={(pan) => onStripChange({ pan })}
            onTouch={() => onTouchParam('pan')}
            onRelease={() => onReleaseParam('pan')}
          />
          <div className="flex items-end gap-1.5 flex-1">
            <Fader
              volumeDb={track.volume_db}
              muted={track.mute}
              onChange={(db) => onStripChange({ volume_db: db })}
              onTouch={() => onTouchParam('volume_db')}
              onRelease={() => onReleaseParam('volume_db')}
            />
            <PeakMeter dbL={meter.dbL} dbR={meter.dbR} holdL={meter.holdL} holdR={meter.holdR} clip={meter.clip} onReset={onResetHold} />
          </div>
        </>
      )}
      {isPhone && (
        <div className="w-full flex items-center gap-1.5">
          <div className="flex-1 text-xs tabular-nums text-center text-muted-foreground">{formatDb(track.volume_db)}</div>
          <PeakMeter dbL={meter.dbL} dbR={meter.dbR} holdL={meter.holdL} holdR={meter.holdR} clip={meter.clip} onReset={onResetHold} height={48} />
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

    </div>
  );
}

// ── TrackEqPanel — docked below the strip row (up to 4 bands) ─────────
// Deliberately NOT a Sheet/Dialog: portaled overlays escape the Studio's
// `.dark` container (they rendered light-mode) and modally take over the
// screen. Docked in the mixer flow, it inherits the dark tokens and the
// strips + transport stay visible and usable while EQing.

function TrackEqPanel({
  track, onChange, onClose,
}: {
  track: Track;
  onChange: (eq: TrackEqBand[]) => void;
  onClose: () => void;
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
    <div className="bg-card border border-border rounded-md" data-testid="track-eq-panel">
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-2 text-sm">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">EQ</span>
        <span className="text-xs text-muted-foreground">· {track.name}</span>
        <button
          onClick={onClose}
          className="ml-auto text-xs px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
          title="Close EQ"
          aria-label="Close EQ"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 text-sm">
        {bands.length === 0 && (
          <p className="text-xs text-muted-foreground mb-2">No EQ bands yet — add one below.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-2">
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
        </div>
        <button
          onClick={addBand}
          disabled={bands.length >= MAX_EQ_BANDS}
          className="w-full h-9 rounded border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Add band {bands.length >= MAX_EQ_BANDS ? '(max 4)' : ''}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PanKnob — vertical-swipe drag, 100px = full -1..1 range, double-tap centers
// ═══════════════════════════════════════════════════════════════════

function PanKnob({ pan, onChange, onTouch, onRelease }: {
  pan: number;
  onChange: (pan: number) => void;
  onTouch?: () => void;
  onRelease?: () => void;
}) {
  const dragRef = useRef<{ y: number; pan: number } | null>(null);
  const movedRef = useRef(false);
  const startYRef = useRef(0);
  const tap = useTapTracker();

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { y: e.clientY, pan };
    movedRef.current = false;
    onTouch?.();
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
    onRelease?.();
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

function Fader({ volumeDb, muted, onChange, onTouch, onRelease }: {
  volumeDb: number;
  muted: boolean;
  onChange: (db: number) => void;
  onTouch?: () => void;
  onRelease?: () => void;
}) {
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
    onTouch?.();
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
    onRelease?.();
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

function PeakMeter({ dbL, dbR, holdL, holdR, clip = false, onReset, height = FADER_TRACK_HEIGHT }: {
  dbL: number; dbR: number; holdL: number; holdR: number;
  clip?: boolean; onReset: () => void; height?: number;
}) {
  // The peak-hold readout combines both sides so a hard-panned track
  // still shows a numeric peak. Bars stay independent.
  const holdDb = Math.max(holdL, holdR);
  return (
    <button
      type="button"
      onClick={onReset}
      title={clip ? 'Clipped — tap to reset' : 'Tap to reset peak hold'}
      className="flex flex-col items-center gap-0.5 justify-end px-2 py-1 min-w-11 min-h-11"
    >
      {/* Phase 6 — persistent clip indicator. Latches red once EITHER
       *  channel crosses 0 dBFS; clears on the same reset tap as peak-hold. */}
      <span
        className={`w-4 h-1 rounded-sm ${clip ? 'bg-rose-500' : 'bg-transparent'}`}
        aria-label={clip ? 'Clipping' : undefined}
      />
      <span className={`text-xs tabular-nums leading-none ${clip ? 'text-rose-400' : 'text-muted-foreground'}`}>
        {holdDb === -Infinity ? '—' : holdDb.toFixed(0)}
      </span>
      <div className="flex gap-0.5 items-end" style={{ height }}>
        <StereoBar db={dbL} height={height} />
        <StereoBar db={dbR} height={height} />
      </div>
    </button>
  );
}

/** One side of a stereo PPM bar. Shared color ramp (green / amber /
 *  rose) matches the pre-stereo single-bar look. */
function StereoBar({ db, height }: { db: number; height: number }) {
  const pct = clamp(((db === -Infinity ? -60 : db) + 60) / 60 * 100, 0, 100);
  const hot = db > -3;
  const warm = db > -12;
  return (
    <div className="w-1.5 bg-muted rounded-sm overflow-hidden flex flex-col justify-end" style={{ height }}>
      <div
        className={`w-full transition-[height] duration-75 ${hot ? 'bg-rose-500' : warm ? 'bg-amber-400' : 'bg-emerald-500'}`}
        style={{ height: `${pct}%` }}
      />
    </div>
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
        <PeakMeter dbL={meter.dbL} dbR={meter.dbR} holdL={meter.holdL} holdR={meter.holdR} clip={meter.clip} onReset={onResetHold} height={64} />
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

// ═══════════════════════════════════════════════════════════════════
// v2.0.0 mixer additions — output selector, bus strip, add-bus tile
// ═══════════════════════════════════════════════════════════════════

/** Compact dropdown that lets a track/bus pick where its output goes.
 *  MASTER_BUS_ID is always the first entry; the session's user buses
 *  follow. Rendered as a small routing badge (arrow icon + name) so it
 *  reads at a glance on a narrow strip. */
function OutputSelector({
  buses, value, onChange,
}: {
  buses: Bus[];
  value: string;
  onChange: (busId: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-7 px-1.5 py-0 text-[11px] gap-1 [&>svg]:opacity-60">
        <Route className="w-3 h-3 shrink-0 opacity-70" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={MASTER_BUS_ID}>Master</SelectItem>
        {buses.map((b) => (
          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** BusStrip — user bus (v2.0.0). Same fader/pan/M/S/meter geometry as
 *  ChannelStrip but no EQ button, no arm, no input source. Bus tint
 *  distinguishes it from track strips at a glance. Delete button in
 *  the corner triggers session removal + retargets any track pointing
 *  here back to master (see removeBusHandler in MixerView). */
function BusStrip({
  bus, downstreamBuses, meter, onResetHold, onStripChange, onOutputChange, onRemove, fxOpen, onToggleFx, autoOpen, onToggleAuto, automation, onTouchParam, onReleaseParam,
}: {
  bus: Bus;
  /** v2.0.0 (Phase 4c) — user buses this bus can route to. Master
   *  is always available as a target; the caller filters this bus
   *  out to keep users from clicking themselves. */
  downstreamBuses: Bus[];
  /** Phase 6 — parallel-tap meter reading from the engine's per-bus
   *  Tone.Meter. */
  meter: MeterEntry;
  onResetHold: () => void;
  onStripChange: (p: StripPatch) => void;
  /** Called with the new target bus id. The caller runs the cycle
   *  check and toasts on rejection — this button just requests. */
  onOutputChange: (targetBusId: string) => void;
  onRemove: () => void;
  /** Phase 5 — insert rack panel state. */
  fxOpen: boolean;
  onToggleFx: () => void;
  /** Phase 8b — automation panel state. */
  autoOpen: boolean;
  onToggleAuto: () => void;
  automation: Automation[];
  /** Touch/Latch signals from Fader / PanKnob. */
  onTouchParam: (param: AutomationParam) => void;
  onReleaseParam: (param: AutomationParam) => void;
}) {
  const enabledFxCount = bus.fx.filter((f) => f.enabled).length;
  const activeAutoCount = automation.filter(
    (a) => a.target_id === bus.id && a.target_kind === 'bus' && (a.mode === 'read' || a.mode === 'touch' || a.mode === 'latch') && a.points.length > 0,
  ).length;
  return (
    <div className="shrink-0 w-24 sm:w-28 bg-muted/30 border border-border rounded-md flex flex-col items-center gap-1.5 p-1.5 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 h-5 w-5 rounded hover:bg-destructive/20 inline-flex items-center justify-center text-muted-foreground hover:text-destructive"
        title={`Remove ${bus.name}`}
      >
        <X className="w-3 h-3" />
      </button>
      <div className="w-full flex items-center gap-1 min-h-11 sm:min-h-0 pr-5">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: bus.color }}
        />
        <span className="text-xs font-semibold truncate flex-1 min-w-0" title={bus.name}>{bus.name}</span>
      </div>
      <div className="w-full text-[10px] uppercase tracking-wide text-muted-foreground text-center">Bus</div>
      {/* Output selector — only rendered when there's somewhere other
       *  than master to route to. Keeps the strip clean for the common
       *  single-bus case where every bus routes to master. */}
      {downstreamBuses.length > 0 && (
        <OutputSelector
          buses={downstreamBuses}
          value={bus.output.bus_id}
          onChange={onOutputChange}
        />
      )}
      {/* Phase 5 — Inserts (FX) chip. */}
      <button
        type="button"
        onClick={onToggleFx}
        className={`w-full h-7 rounded border text-[11px] font-semibold inline-flex items-center justify-center gap-1 ${
          fxOpen ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted hover:bg-muted/70'}`}
        title="Bus inserts (FX)"
      >
        FX
        {enabledFxCount > 0 && (
          <span className="text-[10px] px-1 rounded-full bg-emerald-500/25 text-emerald-300 tabular-nums">{enabledFxCount}</span>
        )}
      </button>

      {/* Phase 8b — Automation chip. */}
      <button
        type="button"
        onClick={onToggleAuto}
        className={`w-full h-7 rounded border text-[11px] font-semibold inline-flex items-center justify-center gap-1 ${
          autoOpen ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted hover:bg-muted/70'}`}
        title="Bus automation"
      >
        Auto
        {activeAutoCount > 0 && (
          <span className="text-[10px] px-1 rounded-full bg-emerald-500/25 text-emerald-300 tabular-nums">{activeAutoCount}</span>
        )}
      </button>
      <PanKnob
        pan={bus.pan}
        onChange={(pan) => onStripChange({ pan })}
        onTouch={() => onTouchParam('pan')}
        onRelease={() => onReleaseParam('pan')}
      />
      <div className="flex items-end gap-1.5 flex-1">
        <Fader
          volumeDb={bus.volume_db}
          muted={bus.mute}
          onChange={(db) => onStripChange({ volume_db: db })}
          onTouch={() => onTouchParam('volume_db')}
          onRelease={() => onReleaseParam('volume_db')}
        />
        <PeakMeter dbL={meter.dbL} dbR={meter.dbR} holdL={meter.holdL} holdR={meter.holdR} clip={meter.clip} onReset={onResetHold} />
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onStripChange({ mute: !bus.mute })}
          className={`text-sm font-bold px-1.5 py-0.5 rounded border ${bus.mute ? 'bg-amber-400 border-amber-400 text-amber-950' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}
        >M</button>
        <button
          onClick={() => onStripChange({ solo: !bus.solo })}
          className={`text-sm font-bold px-1.5 py-0.5 rounded border ${bus.solo ? 'bg-yellow-400 border-yellow-400 text-yellow-950' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}
        >S</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SendsPanel — v2.0.0
// ═══════════════════════════════════════════════════════════════════
//
// Docked below the strip row (same pattern as TrackEqPanel) so the
// mixer stays visible while a user is editing a track's sends. Each
// row shows: target bus dropdown, pre/post toggle, level slider, dB
// readout, enable toggle, remove button.

function SendsPanel({
  track, buses, onAdd, onRemove, onLevelChange, onFieldChange, onClose,
}: {
  track: Track;
  buses: Bus[];
  onAdd: (targetBusId: string) => void;
  onRemove: (sendId: string) => void;
  onLevelChange: (sendId: string, levelDb: number) => void;
  onFieldChange: (sendId: string, patch: Partial<Send>) => void;
  onClose: () => void;
}) {
  const sends = track.sends ?? [];
  const atCap = sends.length >= MAX_SENDS_PER_TRACK;
  return (
    <div className="bg-card border border-border rounded-md p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          <span className="text-muted-foreground">Sends —</span> {track.name}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded hover:bg-muted inline-flex items-center justify-center text-muted-foreground"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {sends.length === 0 && (
        <div className="text-xs text-muted-foreground">
          No sends yet. Add one to route a copy of this track into a bus.
        </div>
      )}
      {sends.map((snd) => {
        const bus = buses.find((b) => b.id === snd.target_bus_id);
        return (
          <div key={snd.id} className="grid grid-cols-[10rem_5rem_1fr_3.5rem_5rem_2rem] items-center gap-2">
            <Select value={snd.target_bus_id} onValueChange={(v) => onFieldChange(snd.id, { target_bus_id: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={MASTER_BUS_ID}>Master</SelectItem>
                {buses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => onFieldChange(snd.id, { pre_fader: !snd.pre_fader })}
              className={`h-8 rounded border text-[11px] font-semibold ${
                snd.pre_fader ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
              title={snd.pre_fader ? 'Pre-fader (independent of track fader)' : 'Post-fader (follows track fader)'}
            >
              {snd.pre_fader ? 'Pre' : 'Post'}
            </button>
            <Slider
              value={[snd.level_db]}
              min={-60} max={6} step={0.1}
              onValueChange={(v) => onLevelChange(snd.id, v[0])}
              className="flex-1"
              disabled={!snd.enabled}
            />
            <span className={`text-xs tabular-nums text-right ${snd.enabled ? '' : 'text-muted-foreground'}`}>{formatDb(snd.level_db)} dB</span>
            <Switch
              checked={snd.enabled}
              onCheckedChange={(v) => onFieldChange(snd.id, { enabled: v })}
              aria-label={snd.enabled ? 'Disable send' : 'Enable send'}
            />
            <button
              type="button"
              onClick={() => onRemove(snd.id)}
              className="h-8 w-8 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground inline-flex items-center justify-center"
              title={`Remove send${bus ? ' to ' + bus.name : ''}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
      <AddSendControl buses={buses} disabled={atCap} onAdd={onAdd} />
    </div>
  );
}

/** Inline "+ Send" control — dropdown of target buses. Master is always
 *  selectable; the user's buses follow. Disabled when the track already
 *  has MAX_SENDS_PER_TRACK. */
function AddSendControl({ buses, disabled, onAdd }: { buses: Bus[]; disabled: boolean; onAdd: (busId: string) => void }) {
  const [pending, setPending] = useState<string>('');
  return (
    <div className="flex items-center gap-2 pt-1 border-t border-border">
      <Select value={pending} onValueChange={setPending}>
        <SelectTrigger className="h-8 w-40 text-xs" disabled={disabled}>
          <SelectValue placeholder={disabled ? `Send cap reached (${MAX_SENDS_PER_TRACK})` : 'Add send to…'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={MASTER_BUS_ID}>Master</SelectItem>
          {buses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <button
        type="button"
        disabled={!pending || disabled}
        onClick={() => { onAdd(pending); setPending(''); }}
        className={`h-8 px-3 rounded border text-xs font-semibold ${
          !pending || disabled
            ? 'border-border/50 bg-muted/30 text-muted-foreground/40 cursor-not-allowed'
            : 'border-border bg-muted hover:bg-muted/70'
        }`}
      >
        Add
      </button>
    </div>
  );
}

/** Compact "+ Bus" tile at the end of the strip row. Disabled when the
 *  session already has MAX_BUSES; the disabled state renders greyed to
 *  match the cap even before the user tries to click. */
function AddBusTile({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 w-14 self-stretch border border-dashed rounded-md flex flex-col items-center justify-center gap-1 text-[11px] ${
        disabled
          ? 'border-border/50 text-muted-foreground/40 cursor-not-allowed'
          : 'border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground'
      }`}
      title={disabled ? `Bus cap reached (${MAX_BUSES})` : 'Add a bus'}
    >
      <Plus className="w-4 h-4" />
      Bus
    </button>
  );
}
