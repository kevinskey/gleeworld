// Instrument Player — pick a voice, hear real recorded samples through
// a scrollable C2–C7 keyboard. Voices are loaded via smplr from
// FluidR3_GM SoundFont JS files served at /soundfonts/<name>-mp3.js.
// In Capacitor (native iOS) we fetch from the platform host instead
// because the bundle doesn't ship the ~48MB of soundfont JS files.
//
// Press-and-hold per key: pointer down starts the note, pointer up/leave
// releases it. Multi-touch chords work because each key tracks its own
// release function.

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Soundfont } from 'smplr';
import { cn } from '@/lib/utils';
import { forceAudioUnlock } from '@/lib/audioTools/unlock';
import { DrumsPlayer } from './DrumsPlayer';

interface InstrumentPlayerProps {
  className?: string;
}

type InstrumentKey =
  | 'electric_piano_1' | 'church_organ'
  | 'flute' | 'clarinet' | 'oboe'
  | 'violin' | 'cello' | 'acoustic_guitar_nylon' | 'acoustic_bass'
  | 'trumpet' | 'french_horn'
  | 'marimba' | 'tubular_bells'
  | 'choir_aahs' | 'lead_2_sawtooth'
  | 'drum_timpani' | 'drum_djembe' | 'drum_drumset';

interface InstrumentDef {
  key: InstrumentKey;
  label: string;
  category: 'Keys' | 'Winds' | 'Strings' | 'Brass' | 'Percussion' | 'Voice' | 'Synth' | 'Drums';
}

const INSTRUMENTS: InstrumentDef[] = [
  { key: 'electric_piano_1',     label: 'Electric Piano',  category: 'Keys' },
  { key: 'church_organ',         label: 'Pipe Organ',      category: 'Keys' },
  { key: 'flute',                label: 'Flute',           category: 'Winds' },
  { key: 'clarinet',             label: 'Clarinet',        category: 'Winds' },
  { key: 'oboe',                 label: 'Oboe',            category: 'Winds' },
  { key: 'violin',               label: 'Violin',          category: 'Strings' },
  { key: 'cello',                label: 'Cello',           category: 'Strings' },
  { key: 'acoustic_guitar_nylon', label: 'Nylon Guitar',   category: 'Strings' },
  { key: 'acoustic_bass',        label: 'Acoustic Bass',   category: 'Strings' },
  { key: 'trumpet',              label: 'Trumpet',         category: 'Brass' },
  { key: 'french_horn',          label: 'French Horn',     category: 'Brass' },
  { key: 'marimba',              label: 'Marimba',         category: 'Percussion' },
  { key: 'tubular_bells',        label: 'Tubular Bells',   category: 'Percussion' },
  { key: 'choir_aahs',           label: 'Choir Aahs',      category: 'Voice' },
  { key: 'lead_2_sawtooth',      label: 'Synth Lead',      category: 'Synth' },
  { key: 'drum_timpani',         label: 'Timpani',         category: 'Drums' },
  { key: 'drum_djembe',          label: 'Djembe',          category: 'Drums' },
  { key: 'drum_drumset',         label: 'Drum Kit',        category: 'Drums' },
];

const DRUM_KIT_FOR: Record<string, 'timpani' | 'djembe' | 'drumset' | undefined> = {
  drum_timpani: 'timpani',
  drum_djembe:  'djembe',
  drum_drumset: 'drumset',
};

// On web the files are served from the same origin as the SPA. On native
// (Capacitor iOS) the bundle doesn't ship the ~48MB of soundfont JS files,
// so resolve to the platform domain where nginx serves them (with CORS
// open for capacitor:// origin).
const IS_NATIVE_RUNTIME =
  typeof window !== 'undefined' &&
  ((window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true ||
    window.location.protocol === 'capacitor:');
const SOUNDFONT_BASE = IS_NATIVE_RUNTIME
  ? 'https://gleeworld.org/soundfonts/'
  : '/soundfonts/';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const WHITE = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']);

interface KeyDef { note: string; isBlack: boolean; pitchClass: string }
function buildRange(startOctave: number, endOctave: number): KeyDef[] {
  const keys: KeyDef[] = [];
  for (let o = startOctave; o < endOctave; o++) {
    for (const n of NOTE_NAMES) {
      keys.push({ note: `${n}${o}`, isBlack: !WHITE.has(n), pitchClass: n });
    }
  }
  keys.push({ note: `C${endOctave}`, isBlack: false, pitchClass: 'C' });
  return keys;
}

export function InstrumentPlayer({ className }: InstrumentPlayerProps) {
  const [instrument, setInstrument] = useState<InstrumentKey>('flute');
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const sampleRef = useRef<Soundfont | null>(null);
  const noteStopRefs = useRef<Map<string, () => void>>(new Map());

  const drumKit = DRUM_KIT_FOR[instrument];
  const isDrumMode = !!drumKit;

  const teardownCurrentInstrument = () => {
    noteStopRefs.current.forEach((stop) => { try { stop(); } catch { /* ignore */ } });
    noteStopRefs.current.clear();
    const prev = sampleRef.current;
    sampleRef.current = null;
    if (!prev) return;
    try { prev.stop(); } catch { /* already stopped */ }
    try { prev.disconnect(); } catch { /* already disconnected */ }
  };

  useEffect(() => {
    if (isDrumMode) {
      teardownCurrentInstrument();
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    teardownCurrentInstrument();

    let player: Soundfont | null = null;
    try {
      const ctx = Tone.getContext().rawContext as AudioContext;
      player = new Soundfont(ctx, {
        instrument: instrument,
        instrumentUrl: `${SOUNDFONT_BASE}${instrument}-mp3.js`,
      });
      sampleRef.current = player;
    } catch (err) {
      console.warn('[InstrumentPlayer] Soundfont init failed', err);
      setLoading(false);
      return;
    }

    player.load
      .then(() => {
        if (cancelled || !player) return;
        try {
          player.output.connect(Tone.getDestination().input as any);
        } catch (err) {
          console.warn('[InstrumentPlayer] connect failed', err);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn('[InstrumentPlayer] sample load failed', instrument, err);
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrument, isDrumMode]);

  // C2–C7 covers most orchestral instrument ranges. The strip is wider
  // than the container so the user swipes horizontally to reach octaves
  // outside the initial view.
  const keys = useMemo(() => buildRange(2, 7), []);
  // Memoize so the auto-center effect below only runs once on mount —
  // recreating this array on every render would snap the keyboard back
  // to C4 every time a key was pressed.
  const whiteKeys = useMemo(() => keys.filter((k) => !k.isBlack), [keys]);
  const WHITE_KEY_PX = 56;
  const BLACK_KEY_PX = 36;
  const keyboardWidthPx = whiteKeys.length * WHITE_KEY_PX;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Center on C4 *once* on mount; further scroll position is the user's.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const c4Index = whiteKeys.findIndex((k) => k.note === 'C4');
    if (c4Index < 0) return;
    const target = c4Index * WHITE_KEY_PX - (el.clientWidth - WHITE_KEY_PX) / 2;
    el.scrollLeft = Math.max(0, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = (note: string) => {
    forceAudioUnlock();
    Tone.start().catch(() => {});
    const player = sampleRef.current;
    if (!player) return;
    const stop = player.start({ note, velocity: 100 });
    if (typeof stop === 'function') noteStopRefs.current.set(note, stop);
    setActiveNotes((prev) => new Set(prev).add(note));
  };
  const stop = (note: string) => {
    const stopFn = noteStopRefs.current.get(note);
    if (stopFn) { try { stopFn(); } catch { /* ignore */ } }
    noteStopRefs.current.delete(note);
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  };

  // Black keys land at the boundary between two white keys; with index-based
  // absolute positioning each black key sits half its width left of the
  // next white key's left edge.
  const blackKeyPositions = useMemo(() => {
    const positions: Array<{ note: string; leftPx: number }> = [];
    let whiteIdx = 0;
    for (const k of keys) {
      if (!k.isBlack) { whiteIdx += 1; continue; }
      positions.push({ note: k.note, leftPx: whiteIdx * WHITE_KEY_PX - BLACK_KEY_PX / 2 });
    }
    return positions;
  }, [keys, WHITE_KEY_PX, BLACK_KEY_PX]);

  const grouped = useMemo(() => {
    const map: Record<string, InstrumentDef[]> = {};
    for (const inst of INSTRUMENTS) {
      (map[inst.category] ??= []).push(inst);
    }
    return Object.entries(map);
  }, []);

  const currentLabel = INSTRUMENTS.find((i) => i.key === instrument)?.label ?? '';

  return (
    <div className={cn('p-3 space-y-3 bg-card border rounded-lg min-w-0 overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Instrument</div>
        {!isDrumMode && (
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            C2 – C7 · swipe to scroll
          </div>
        )}
      </div>

      <label className="block">
        <span className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Voice</span>
        <select
          value={instrument}
          onChange={(e) => setInstrument(e.target.value as InstrumentKey)}
          className="w-full h-8 px-2 text-sm border rounded bg-background"
        >
          {grouped.map(([category, items]) => (
            <optgroup key={category} label={category}>
              {items.map((inst) => (
                <option key={inst.key} value={inst.key}>{inst.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {isDrumMode && drumKit && (
        <DrumsPlayer key={drumKit} kit={drumKit} embedded />
      )}

      {!isDrumMode && (
        <div className="text-[11px] text-muted-foreground italic">
          {loading
            ? `Loading ${currentLabel} samples…`
            : `Press and hold a key to hear the ${currentLabel}.`}
        </div>
      )}

      {!isDrumMode && (
        <div
          ref={scrollRef}
          className="select-none"
          style={{
            width: '100%',
            height: 160,
            background: '#fff',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            overflowX: 'auto',
            overflowY: 'hidden',
            // Let iOS pan horizontally; the keys themselves still receive
            // pointerdown events for taps, but a swipe scrolls instead.
            touchAction: 'pan-x',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div style={{ width: keyboardWidthPx, height: '100%', position: 'relative' }}>
            {whiteKeys.map((k, idx) => {
              const active = activeNotes.has(k.note);
              return (
                <button
                  key={k.note}
                  type="button"
                  disabled={loading}
                  onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId); start(k.note); }}
                  onPointerUp={() => stop(k.note)}
                  onPointerLeave={() => { if (activeNotes.has(k.note)) stop(k.note); }}
                  onPointerCancel={() => stop(k.note)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: idx * WHITE_KEY_PX,
                    width: WHITE_KEY_PX,
                    background: active ? 'rgba(251,191,36,0.4)' : '#ffffff',
                    borderRight: '1px solid #cbd5e1',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderBottom: 'none',
                    borderBottomLeftRadius: 4,
                    borderBottomRightRadius: 4,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: 6,
                    fontSize: 11,
                    color: '#64748b',
                    cursor: loading ? 'wait' : 'pointer',
                    touchAction: 'pan-x',
                    opacity: loading ? 0.5 : 1,
                    zIndex: 1,
                  }}
                  aria-label={k.note}
                >
                  {k.pitchClass === 'C' ? k.note : ''}
                </button>
              );
            })}
            {blackKeyPositions.map(({ note, leftPx }) => {
              const active = activeNotes.has(note);
              return (
                <button
                  key={note}
                  type="button"
                  disabled={loading}
                  onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId); start(note); }}
                  onPointerUp={() => stop(note)}
                  onPointerLeave={() => { if (activeNotes.has(note)) stop(note); }}
                  onPointerCancel={() => stop(note)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    height: '62%',
                    left: leftPx,
                    width: BLACK_KEY_PX,
                    background: active ? '#fbbf24' : '#0f172a',
                    borderBottomLeftRadius: 4,
                    borderBottomRightRadius: 4,
                    cursor: loading ? 'wait' : 'pointer',
                    border: 'none',
                    touchAction: 'pan-x',
                    opacity: loading ? 0.5 : 1,
                    zIndex: 2,
                  }}
                  aria-label={note}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
