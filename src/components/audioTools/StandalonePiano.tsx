import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Plus, Minus, Maximize2, Minimize2 } from 'lucide-react';
import * as Tone from 'tone';
import { holdPianoNote, preloadPianoSampler, isPianoSamplerLoaded } from '@/lib/audioTools/pianoSampler';
import { forceAudioUnlock } from '@/lib/audioTools/unlock';
import { getMidiInputSource } from '@/lib/midi/midiInputSource';
import { useIsPhone } from '@/hooks/use-mobile';

// Sharp-spelling map (matches Tone's note format the sampler expects) so
// we can turn a raw MIDI note number into a "C4" / "F#3" fullName the
// sampler already understands. Black keys default to sharps — enough for
// hardware keyboard input where the user's spelling intent isn't known.
const MIDI_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
function midiToFullName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${MIDI_NOTE_NAMES[pc]}${octave}`;
}

interface StandalonePianoProps {
  className?: string;
  defaultStartOctave?: number;
  defaultOctaveCount?: number;
  /** When true, the piano expands into a full-width scrolling keyboard
   *  with real piano-key proportions (tall, narrow keys, horizontal
   *  scroll to reach all 7 octaves). Controlled prop so the parent page
   *  can rearrange surrounding content when stage mode is on. */
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const WHITE_NOTES = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']);

interface PianoKey {
  note: string;
  octave: number;
  fullName: string;
  isBlack: boolean;
}

// Real piano dimensions: white key ≈ 22.6mm wide, 150mm tall (6.6:1).
// At iPad retina density (~264 DPI), that's ~85 px per white key. We push
// a hair wider (88) so taps land cleanly with a fingertip rather than
// feeling like chiclets.
const EXPANDED_WHITE_KEY_WIDTH = 88;       // px each white key
const EXPANDED_HEIGHT = 320;               // px keyboard height in stage mode

// Phone compact layout: 14 white keys (≈2 octaves) visible inside a
// ~360 px viewport at 48 px per key gives finger-friendly targets. The
// container scrolls horizontally to reach the rest. Was: all octaves
// crammed into 100% width → ~25 px keys that fingers can't hit cleanly.
const PHONE_WHITE_KEY_WIDTH = 48;
const PHONE_KEYBOARD_HEIGHT = 200;

function generateKeys(startOctave: number, octaveCount: number): PianoKey[] {
  const keys: PianoKey[] = [];
  for (let o = 0; o < octaveCount; o++) {
    for (const n of NOTE_NAMES) {
      keys.push({
        note: n,
        octave: startOctave + o,
        fullName: `${n}${startOctave + o}`,
        isBlack: !WHITE_NOTES.has(n),
      });
    }
  }
  return keys;
}

// Standalone sampled piano. Two display modes:
//   • Compact (default) — sits beside the metronome / tuner at any width.
//   • Expanded ("stage") — fills the container and gets all 7 octaves of
//     scrollable keyboard with real-piano proportions. Other Music Tools
//     UI shrinks to a top strip so the piano gets the bottom of the
//     screen, the way a player at an iPad expects.
export function StandalonePiano({
  className,
  defaultStartOctave = 3,
  defaultOctaveCount = 3,
  expanded = false,
  onToggleExpand,
}: StandalonePianoProps) {
  const isPhone = useIsPhone();
  const [startOctave, setStartOctave] = useState(defaultStartOctave);
  const [octaveCount, setOctaveCount] = useState(defaultOctaveCount);
  const [volume, setVolume] = useState(0.8);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const releaseFnsRef = useRef<Map<string, () => void>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const phoneScrollRef = useRef<HTMLDivElement>(null);

  // In expanded mode we ignore the octave + start-octave controls and
  // render the full keyboard (A0–C8 = 88 keys) so the player can simply
  // scroll horizontally to any pitch they want.
  const renderedOctaves = expanded ? 7 : octaveCount;
  const renderedStart = expanded ? 1 : startOctave;

  useEffect(() => { preloadPianoSampler().catch(() => {}); }, []);
  useEffect(() => {
    try {
      const dest = Tone.getDestination();
      if (dest) (dest as any).volume.value = 20 * Math.log10(Math.max(0.0001, volume));
    } catch {}
  }, [volume]);

  // When the user toggles into expanded mode, scroll-center on middle C.
  useEffect(() => {
    if (!expanded) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const middleCWhiteIdx = (4 - renderedStart) * 7; // C-octave start
      const targetX = middleCWhiteIdx * EXPANDED_WHITE_KEY_WIDTH - el.clientWidth / 2 + EXPANDED_WHITE_KEY_WIDTH * 3.5;
      el.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
    });
  }, [expanded, renderedStart]);

  const keys = useMemo(() => generateKeys(renderedStart, renderedOctaves), [renderedStart, renderedOctaves]);
  const whiteKeys = keys.filter((k) => !k.isBlack);

  const startNote = useCallback(async (key: PianoKey) => {
    // Fire sync unlock first so iOS releases the context inside this tap.
    forceAudioUnlock();
    const startedPromise = Tone.start().catch(() => {});
    if (releaseFnsRef.current.has(key.fullName)) return;
    await startedPromise;
    const release = await holdPianoNote(key.fullName, 0.8);
    releaseFnsRef.current.set(key.fullName, release);
    setActiveNotes((prev) => new Set(prev).add(key.fullName));
  }, []);

  const stopNote = useCallback((key: PianoKey) => {
    const release = releaseFnsRef.current.get(key.fullName);
    if (release) {
      release();
      releaseFnsRef.current.delete(key.fullName);
    }
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(key.fullName);
      return next;
    });
  }, []);

  // Hardware MIDI input — opt-in via the MIDI button in the header. Was
  // absent entirely on this piano ("works in Studio but not here"). The
  // permission prompt needs a user gesture, so we don't auto-subscribe.
  const [midiOn, setMidiOn] = useState(false);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [midiInputName, setMidiInputName] = useState<string>('');
  const midiSupported = useMemo(() => getMidiInputSource().supported, []);
  // Fake keys built on the fly for MIDI input — the note might sit outside
  // the currently rendered octave range, but the sampler handles any note
  // in its loaded range regardless of what's visually on screen.
  const midiKeyFor = useCallback((midi: number): PianoKey => {
    const fullName = midiToFullName(midi);
    return {
      note: fullName.replace(/\d+$/, ''),
      octave: parseInt(fullName.match(/\d+$/)?.[0] ?? '4', 10),
      fullName,
      isBlack: fullName.includes('#'),
    };
  }, []);
  useEffect(() => {
    if (!midiOn) return;
    const source = getMidiInputSource();
    if (!source.supported) {
      setMidiError('This browser has no MIDI support.');
      setMidiOn(false);
      return;
    }
    let cancelled = false;
    let unsub: (() => void) | null = null;
    const refreshName = () => {
      source.listInputs().then((ins) => {
        if (!cancelled) setMidiInputName(ins[0]?.name ?? '');
      }).catch(() => { /* leave name empty */ });
    };
    const unsubState = source.onStateChange(refreshName);
    source
      .subscribe('', (data) => {
        const [status, note, velocity] = data;
        const command = status & 0xf0;
        if (command === 144 && velocity > 0) {
          void startNote(midiKeyFor(note));
        } else if (command === 128 || (command === 144 && velocity === 0)) {
          stopNote(midiKeyFor(note));
        }
      })
      .then((u) => {
        if (cancelled) { u(); return; }
        unsub = u;
        setMidiError(null);
        refreshName();
      })
      .catch((e) => {
        if (cancelled) return;
        setMidiError(e instanceof Error ? e.message : 'MIDI access denied.');
        setMidiOn(false);
      });
    return () => {
      cancelled = true;
      unsub?.();
      unsubState?.();
    };
  }, [midiOn, startNote, stopNote, midiKeyFor]);

  const whiteCount = whiteKeys.length;
  const whitePct = 100 / whiteCount;

  // Black key positions — in compact mode we use percentages of the
  // container; in expanded mode pixel offsets so each key lands precisely
  // on the same x-coord at any scroll position.
  const blackKeyPositions = useMemo(() => {
    const positions: Array<{ key: PianoKey; leftPct: number; leftPx: number }> = [];
    let whiteIdx = 0;
    for (const k of keys) {
      if (!k.isBlack) { whiteIdx += 1; continue; }
      const leftPct = (whiteIdx - 1) * whitePct + whitePct * 0.7;
      const leftPx = whiteIdx * EXPANDED_WHITE_KEY_WIDTH - EXPANDED_WHITE_KEY_WIDTH * 0.3;
      positions.push({ key: k, leftPct, leftPx });
    }
    return positions;
  }, [keys, whitePct]);

  const ExpandButton = onToggleExpand && (
    <Button
      size="sm"
      variant="outline"
      className="h-7 px-2"
      onClick={onToggleExpand}
      title={expanded ? 'Collapse keyboard' : 'Expand to full keyboard'}
    >
      {expanded ? <Minimize2 className="w-3.5 h-3.5 mr-1" /> : <Maximize2 className="w-3.5 h-3.5 mr-1" />}
      {expanded ? 'Collapse' : 'Stage mode'}
    </Button>
  );

  // ──────────────────────────────────────────────────────────────────────
  // Expanded ("stage") mode: full 7-octave scrolling keyboard with real
  // piano proportions. Controls collapse into a compact top strip; the
  // entire bottom area is keys.
  // ──────────────────────────────────────────────────────────────────────
  if (expanded) {
    const keyboardWidthPx = whiteCount * EXPANDED_WHITE_KEY_WIDTH;
    return (
      <div className={cn('bg-card border rounded-lg overflow-hidden flex flex-col', className)}>
        <div className="px-3 py-2 border-b border-border flex items-center gap-3 flex-wrap">
          <div className="text-sm font-semibold">Piano</div>
          {ExpandButton}
          <div className="flex items-center gap-2 text-xs flex-1 min-w-0">
            <span className="text-muted-foreground">Volume</span>
            <Slider value={[Math.round(volume * 100)]} min={0} max={100} step={1} onValueChange={(v) => setVolume(v[0] / 100)} className="flex-1 max-w-xs" />
            <span className="tabular-nums w-8 text-right">{Math.round(volume * 100)}%</span>
            {!isPianoSamplerLoaded() && (
              <span className="italic ml-2 text-muted-foreground">(loading samples…)</span>
            )}
          </div>
          {midiSupported && (
            <button
              type="button"
              onClick={() => setMidiOn((p) => !p)}
              className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors ${
                midiOn
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={
                midiError
                  ? `MIDI: ${midiError}`
                  : midiOn
                    ? `MIDI on — ${midiInputName || 'no device — plug one in'}`
                    : 'Enable MIDI keyboard input'
              }
              aria-label={midiOn ? 'Disable MIDI input' : 'Enable MIDI input'}
            >
              MIDI
            </button>
          )}
        </div>
        {/* Stage-mode keyboard. All visuals via inline `style` (no
            Tailwind arbitrary values) so iOS WKWebView + any downstream
            CSS pipeline can't accidentally strip the black-key overlay.
            Explicit zIndex pins black keys above the white-key row. */}
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-hidden"
          style={{ touchAction: 'pan-x', background: '#f1f5f9' }}
        >
          <div
            className="relative select-none"
            style={{ width: keyboardWidthPx, height: EXPANDED_HEIGHT, background: '#fff' }}
          >
            <div className="flex absolute inset-0" style={{ zIndex: 1 }}>
              {whiteKeys.map((k) => {
                const active = activeNotes.has(k.fullName);
                return (
                  <button
                    key={k.fullName}
                    type="button"
                    onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); startNote(k); }}
                    onPointerUp={() => stopNote(k)}
                    onPointerLeave={() => stopNote(k)}
                    onPointerCancel={() => stopNote(k)}
                    style={{
                      width: EXPANDED_WHITE_KEY_WIDTH,
                      flexShrink: 0,
                      background: active ? 'rgba(251,191,36,0.4)' : '#ffffff',
                      borderRight: '1px solid #cbd5e1',
                      borderBottomLeftRadius: 4,
                      borderBottomRightRadius: 4,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingBottom: 8,
                      fontSize: 10,
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                    aria-label={k.fullName}
                  >
                    {k.note === 'C' ? k.fullName : ''}
                  </button>
                );
              })}
            </div>
            <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: 'none' }}>
              {blackKeyPositions.map(({ key, leftPx }) => {
                const active = activeNotes.has(key.fullName);
                return (
                  <button
                    key={key.fullName}
                    type="button"
                    onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); startNote(key); }}
                    onPointerUp={() => stopNote(key)}
                    onPointerLeave={() => stopNote(key)}
                    onPointerCancel={() => stopNote(key)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: leftPx,
                      width: EXPANDED_WHITE_KEY_WIDTH * 0.6,
                      height: EXPANDED_HEIGHT * 0.62,
                      background: active ? '#fbbf24' : '#0f172a',
                      borderBottomLeftRadius: 4,
                      borderBottomRightRadius: 4,
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                    aria-label={key.fullName}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/30 border-t border-border">
          Scroll horizontally to reach any octave. Tap any key to play.
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Compact (default) mode
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div className={cn('p-3 bg-card border rounded-lg space-y-3', className)}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm font-semibold">Piano</div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {ExpandButton}
          <span className="text-muted-foreground">Octaves</span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setOctaveCount((v) => Math.max(1, v - 1))}>
            <Minus className="w-3 h-3" />
          </Button>
          <span className="tabular-nums w-6 text-center">{octaveCount}</span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setOctaveCount((v) => Math.min(5, v + 1))}>
            <Plus className="w-3 h-3" />
          </Button>
          <span className="text-muted-foreground ml-2">From</span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setStartOctave((v) => Math.max(1, v - 1))}>
            <Minus className="w-3 h-3" />
          </Button>
          <span className="tabular-nums w-6 text-center">C{startOctave}</span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setStartOctave((v) => Math.min(7, v + 1))}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Volume</span>
        <Slider value={[Math.round(volume * 100)]} min={0} max={100} step={1} onValueChange={(v) => setVolume(v[0] / 100)} className="flex-1 max-w-xs" />
        <span className="tabular-nums w-8 text-right">{Math.round(volume * 100)}%</span>
        {!isPianoSamplerLoaded() && (
          <span className="italic ml-2">(loading samples…)</span>
        )}
      </div>

      {/* Compact keyboard.
          We render both layers with plain inline `style` rather than
          Tailwind arbitrary value classes (`h-[180px]`, `h-[62%]`, …) —
          some downstream tooling (PurgeCSS / iOS WKWebView's older CSS
          engine) silently drops those, which is the most plausible
          reason past builds showed *only* the white keys' bottom edge.
          On phones we render at a fixed finger-friendly key width and
          wrap in a horizontal scroller so only ~2 octaves are visible
          at once and the rest is reachable via swipe — keys at full
          flex width on a 360 px viewport are too narrow to hit cleanly. */}
      {isPhone ? (
        <div
          ref={phoneScrollRef}
          className="relative w-full select-none overflow-x-auto overflow-y-hidden"
          style={{
            height: PHONE_KEYBOARD_HEIGHT,
            background: '#fff',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            touchAction: 'pan-x',
          }}
        >
          <div
            className="relative select-none"
            style={{
              width: whiteCount * PHONE_WHITE_KEY_WIDTH,
              height: '100%',
            }}
          >
            <div className="flex absolute inset-0" style={{ zIndex: 1 }}>
              {whiteKeys.map((k) => {
                const active = activeNotes.has(k.fullName);
                return (
                  <button
                    key={k.fullName}
                    type="button"
                    onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); startNote(k); }}
                    onPointerUp={() => stopNote(k)}
                    onPointerLeave={() => stopNote(k)}
                    onPointerCancel={() => stopNote(k)}
                    style={{
                      width: PHONE_WHITE_KEY_WIDTH,
                      flexShrink: 0,
                      background: active ? 'rgba(251,191,36,0.4)' : '#ffffff',
                      borderRight: '1px solid #cbd5e1',
                      borderBottomLeftRadius: 4,
                      borderBottomRightRadius: 4,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingBottom: 6,
                      fontSize: 10,
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                    aria-label={k.fullName}
                  >
                    {k.note === 'C' ? k.fullName : ''}
                  </button>
                );
              })}
            </div>
            <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: 'none' }}>
              {blackKeyPositions.map(({ key, leftPx: _, }, idx) => {
                // Recompute leftPx for the phone-specific white-key width.
                // (blackKeyPositions was memoized against EXPANDED width.)
                const active = activeNotes.has(key.fullName);
                // Find the white-key index for this black key.
                let whiteIdx = 0;
                let count = 0;
                for (const k of keys) {
                  if (k.fullName === key.fullName) break;
                  if (!k.isBlack) { whiteIdx += 1; }
                  count += 1;
                }
                const leftPx = whiteIdx * PHONE_WHITE_KEY_WIDTH - PHONE_WHITE_KEY_WIDTH * 0.3;
                return (
                  <button
                    key={key.fullName}
                    type="button"
                    onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); startNote(key); }}
                    onPointerUp={() => stopNote(key)}
                    onPointerLeave={() => stopNote(key)}
                    onPointerCancel={() => stopNote(key)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: leftPx,
                      width: PHONE_WHITE_KEY_WIDTH * 0.6,
                      height: PHONE_KEYBOARD_HEIGHT * 0.62,
                      background: active ? '#fbbf24' : '#0f172a',
                      borderBottomLeftRadius: 4,
                      borderBottomRightRadius: 4,
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                    aria-label={key.fullName}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : (
      <div
        className="relative w-full select-none"
        style={{ height: 200, background: '#fff', borderRadius: 6, border: '1px solid #cbd5e1', overflow: 'hidden' }}
      >
        {/* White keys — render as a flex row of buttons, position:relative
            so they stack at z-index 0 underneath the black overlay. */}
        <div className="flex absolute inset-0" style={{ zIndex: 1 }}>
          {whiteKeys.map((k) => {
            const active = activeNotes.has(k.fullName);
            return (
              <button
                key={k.fullName}
                type="button"
                onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); startNote(k); }}
                onPointerUp={() => stopNote(k)}
                onPointerLeave={() => stopNote(k)}
                onPointerCancel={() => stopNote(k)}
                style={{
                  flex: '1 1 0',
                  background: active ? 'rgba(251,191,36,0.4)' : '#ffffff',
                  borderRight: '1px solid #cbd5e1',
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: 4,
                  fontSize: 10,
                  color: '#64748b',
                  cursor: 'pointer',
                }}
                aria-label={k.fullName}
              >
                {k.note === 'C' ? k.fullName : ''}
              </button>
            );
          })}
        </div>
        {/* Black keys overlay — high z-index so they paint on top of the
            white-key row no matter what stacking quirks the browser does. */}
        <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: 'none' }}>
          {blackKeyPositions.map(({ key, leftPct }) => {
            const active = activeNotes.has(key.fullName);
            return (
              <button
                key={key.fullName}
                type="button"
                onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); startNote(key); }}
                onPointerUp={() => stopNote(key)}
                onPointerLeave={() => stopNote(key)}
                onPointerCancel={() => stopNote(key)}
                style={{
                  position: 'absolute',
                  top: 0,
                  height: '62%',
                  left: `${leftPct}%`,
                  width: `${whitePct * 0.6}%`,
                  background: active ? '#fbbf24' : '#0f172a',
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  border: 'none',
                }}
                aria-label={key.fullName}
              />
            );
          })}
        </div>
      </div>
      )}
      {isPhone && (
        <p className="text-[10px] text-muted-foreground text-center">
          Swipe to reach more octaves
        </p>
      )}
    </div>
  );
}
