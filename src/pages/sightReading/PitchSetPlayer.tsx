import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Mic, Check, X, ArrowLeft, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Voice } from '@/lib/sightReading/generate';
import { useMicPitch } from '@/lib/sightReading/useMicPitch';
import { supabase } from '@/integrations/supabase/client';

// --- constants (mirror PitchMatchTab defaults) ---
const HOLD_MS_REQUIRED = 2000;
const LISTEN_MS = 4000;
const TONE_GAIN = 0.14;
const CLARITY_MIN = 0.7;
const CENTS_TOLERANCE = 50;

// --- MIDI helpers ---
const MIDI_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiName(m: number): string { return `${MIDI_NAMES[m % 12]}${Math.floor(m / 12) - 1}`; }
function midiToHz(m: number): number { return 440 * Math.pow(2, (m - 69) / 12); }

// --- Voice tonic (nearest C in range) so sets adapt to the singer ---
const VOICE_RANGE: Record<Voice, [number, number]> = {
  soprano: [60, 81], alto: [55, 76], tenor: [48, 67], bass: [40, 60],
};
function tonicFor(voice: Voice): number {
  const [lo, hi] = VOICE_RANGE[voice];
  const mid = Math.round((lo + hi) / 2);
  // Nearest C to range center
  return mid - ((mid - 60) % 12 + 12) % 12;
}

// --- Set catalog. Notes are stored as SCALE DEGREES (0-based semitones
//     from tonic) so we can transpose each set into the singer's voice.
//     Degree 0 = tonic, 4 = major 3rd, 7 = perfect 5th, 12 = octave, etc.

type Tier = 'warmup' | 'intervals' | 'melody' | 'advanced';

interface SetDef {
  id: string;
  label: string;
  tier: Tier;
  blurb: string;
  degrees: number[];
}

const SETS: SetDef[] = [
  // Warm-ups
  { id: 'warmup-home',       label: 'Home Tone',        tier: 'warmup', blurb: 'Sing the tonic 5 times. Anchors your ear.', degrees: [0, 0, 0, 0, 0] },
  { id: 'warmup-do-re-mi',   label: 'Do–Re–Mi',         tier: 'warmup', blurb: 'The first three scale degrees.',            degrees: [0, 2, 4] },
  { id: 'warmup-triad',      label: 'Major Triad',      tier: 'warmup', blurb: 'Do–Mi–Sol, up and back.',                   degrees: [0, 4, 7, 4, 0] },
  { id: 'warmup-scale-up',   label: 'Major Scale Up',   tier: 'warmup', blurb: 'Climb the full scale.',                     degrees: [0, 2, 4, 5, 7, 9, 11, 12] },
  { id: 'warmup-scale-down', label: 'Major Scale Down', tier: 'warmup', blurb: 'Descend the full scale.',                   degrees: [12, 11, 9, 7, 5, 4, 2, 0] },

  // Intervals
  { id: 'int-p5-ladder',  label: 'P5 Ladder',    tier: 'intervals', blurb: 'Do–Sol alternating. Trains the perfect fifth.', degrees: [0, 7, 0, 7, 0, 7] },
  { id: 'int-m3-stack',   label: 'Third Stack',  tier: 'intervals', blurb: 'Stacked thirds C–E–G–B.',                        degrees: [0, 4, 7, 11] },
  { id: 'int-octave',     label: 'Octave Jumps', tier: 'intervals', blurb: 'Between two octaves of tonic.',                  degrees: [0, 12, 0, 12] },
  { id: 'int-m6-leap',    label: 'Minor 6th Leap', tier: 'intervals', blurb: 'Wide leaps up and down.',                      degrees: [0, 8, 0, 8] },

  // Melodies (playable by ear — everyone knows these)
  { id: 'mel-twinkle',    label: 'Twinkle Twinkle',   tier: 'melody', blurb: 'First line: Twinkle twinkle little star.',   degrees: [0, 0, 7, 7, 9, 9, 7] },
  { id: 'mel-frere',      label: 'Frère Jacques',     tier: 'melody', blurb: 'Opening phrase: Are you sleeping?',           degrees: [0, 2, 4, 0] },
  { id: 'mel-amazing',    label: 'Amazing Grace',     tier: 'melody', blurb: 'Opening: Amazing grace, how sweet the sound.', degrees: [-5, 0, 4, 0, 4, 2, 0, -3, -5] },
  { id: 'mel-hot-cross',  label: 'Hot Cross Buns',    tier: 'melody', blurb: 'Simple 3-note melody.',                       degrees: [4, 2, 0, 4, 2, 0] },

  // Advanced
  { id: 'adv-chromatic',  label: 'Chromatic 5',      tier: 'advanced', blurb: 'Half-step ladder — precision required.', degrees: [0, 1, 2, 3, 4] },
  { id: 'adv-dim7',       label: 'Diminished 7th',   tier: 'advanced', blurb: 'Stacked minor thirds.',                   degrees: [0, 3, 6, 9, 12] },
  { id: 'adv-wide-arp',   label: 'Wide Arpeggio',    tier: 'advanced', blurb: 'Do–Mi–Sol–Do–Sol–Mi–Do across octaves.', degrees: [0, 4, 7, 12, 7, 4, 0] },
];

const TIER_LABEL: Record<Tier, string> = { warmup: 'Warm-ups', intervals: 'Intervals', melody: 'Melodies', advanced: 'Advanced' };
const TIER_ORDER: Tier[] = ['warmup', 'intervals', 'melody', 'advanced'];

// --- Audio ---
function primeToneCtx(): AudioContext | null {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  if (ctx.state === 'suspended') { void ctx.resume(); }
  return ctx;
}

// Sustains a tone on a pre-created ctx. Returns stop().
function startSustainedTone(ctx: AudioContext, midi: number, durationMs: number): () => void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = midiToHz(midi);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(TONE_GAIN, t + 0.03);
  g.gain.setValueAtTime(TONE_GAIN, t + (durationMs - 150) / 1000);
  g.gain.linearRampToValueAtTime(0, t + durationMs / 1000);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + durationMs / 1000 + 0.1);
  let stopped = false;
  return () => {
    if (stopped) return; stopped = true;
    try {
      const now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.stop(now + 0.1);
    } catch { /* already stopped */ }
  };
}

function playCorrectChime(ctx: AudioContext, rootMidi: number): void {
  const notes = [rootMidi, rootMidi + 4, rootMidi + 7];
  const t0 = ctx.currentTime + 0.02;
  notes.forEach((n, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(n);
    const start = t0 + i * 0.06;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.14, start + 0.02);
    g.gain.linearRampToValueAtTime(0, start + 0.22);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(start); osc.stop(start + 0.25);
  });
}

interface Props {
  voice: Voice;
}

type NoteResult = 'pending' | 'active' | 'correct' | 'missed';

export function PitchSetPlayer({ voice }: Props) {
  const mic = useMicPitch();
  const [selectedSet, setSelectedSet] = useState<SetDef | null>(null);
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState<number[]>([]);
  const [results, setResults] = useState<NoteResult[]>([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [heldMs, setHeldMs] = useState(0);
  const [finished, setFinished] = useState(false);
  const [runId, setRunId] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopToneRef = useRef<null | (() => void)>(null);
  const heldStartRef = useRef<number | null>(null);
  const noteTimeoutRef = useRef<number | null>(null);
  const holdCheckRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const currentIdxRef = useRef(-1);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);
  const notesRef = useRef<number[]>([]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  const micLiveRef = useRef<typeof mic.live>(null);
  useEffect(() => { micLiveRef.current = mic.live; }, [mic.live]);

  const cleanup = useCallback(() => {
    cancelledRef.current = true;
    if (noteTimeoutRef.current) { clearTimeout(noteTimeoutRef.current); noteTimeoutRef.current = null; }
    if (holdCheckRef.current) { clearInterval(holdCheckRef.current); holdCheckRef.current = null; }
    if (stopToneRef.current) { stopToneRef.current(); stopToneRef.current = null; }
    if (audioCtxRef.current) {
      try { void audioCtxRef.current.close(); } catch { /* noop */ }
      audioCtxRef.current = null;
    }
    mic.stop();
    heldStartRef.current = null;
    setHeldMs(0);
  }, [mic]);

  // Unmount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => cleanup(), []);

  const persistAttempt = useCallback(async (setId: string, position: number, targetMidi: number, sungMidi: number | null, centsOff: number | null, matched: boolean, heldMsFinal: number) => {
    const { error } = await supabase.from('gw_pitch_match_attempts').insert({
      voice,
      mode: 'sets',
      set_id: setId,
      set_position: position,
      target_midi: targetMidi,
      sung_midi: sungMidi,
      cents_off: centsOff,
      matched,
      held_ms: heldMsFinal,
    });
    if (error) {
      toast.error('Attempt not saved', { description: error.message });
    }
  }, [voice]);

  const advanceRef = useRef<((idx: number) => void) | null>(null);

  const playNote = useCallback((idx: number) => {
    if (cancelledRef.current) return;
    if (!audioCtxRef.current || !selectedSet) return;
    const target = notesRef.current[idx];
    if (target == null) return;
    setCurrentIdx(idx);
    setResults((prev) => prev.map((r, i) => (i === idx ? 'active' : i < idx ? r : 'pending')));
    setHeldMs(0);
    heldStartRef.current = null;
    // Play the reference tone for the full listening window.
    stopToneRef.current = startSustainedTone(audioCtxRef.current, target, LISTEN_MS);

    // Poll live pitch and check hold.
    holdCheckRef.current = window.setInterval(() => {
      const l = micLiveRef.current;
      if (!l || l.clarity < CLARITY_MIN) {
        heldStartRef.current = null; setHeldMs(0); return;
      }
      const centsDiff = Math.abs((l.midi - target) * 100 + l.cents);
      if (centsDiff <= CENTS_TOLERANCE) {
        if (heldStartRef.current == null) heldStartRef.current = performance.now();
        const held = performance.now() - heldStartRef.current;
        setHeldMs(held);
        if (held >= HOLD_MS_REQUIRED) {
          const sungMidi = l.midi;
          const cents = Math.round((l.midi - target) * 100 + l.cents);
          if (holdCheckRef.current) { clearInterval(holdCheckRef.current); holdCheckRef.current = null; }
          if (noteTimeoutRef.current) { clearTimeout(noteTimeoutRef.current); noteTimeoutRef.current = null; }
          if (stopToneRef.current) { stopToneRef.current(); stopToneRef.current = null; }
          setResults((prev) => prev.map((r, i) => (i === idx ? 'correct' : r)));
          if (audioCtxRef.current) playCorrectChime(audioCtxRef.current, target);
          void persistAttempt(selectedSet.id, idx, target, sungMidi, cents, true, Math.round(held));
          advanceRef.current?.(idx + 1);
        }
      } else {
        heldStartRef.current = null; setHeldMs(0);
      }
    }, 80);

    // Missed if we run out of time.
    noteTimeoutRef.current = window.setTimeout(() => {
      if (holdCheckRef.current) { clearInterval(holdCheckRef.current); holdCheckRef.current = null; }
      if (stopToneRef.current) { stopToneRef.current(); stopToneRef.current = null; }
      const l = micLiveRef.current;
      const sungMidi = l ? l.midi : null;
      const cents = l ? Math.round((l.midi - target) * 100 + l.cents) : null;
      setResults((prev) => prev.map((r, i) => (i === idx ? 'missed' : r)));
      void persistAttempt(selectedSet.id, idx, target, sungMidi, cents, false, 0);
      advanceRef.current?.(idx + 1);
    }, LISTEN_MS);
  }, [selectedSet, persistAttempt]);

  advanceRef.current = (nextIdx: number) => {
    if (cancelledRef.current) return;
    if (nextIdx >= notesRef.current.length) {
      setFinished(true);
      setRunning(false);
      setCurrentIdx(-1);
      mic.stop();
      if (audioCtxRef.current) { try { void audioCtxRef.current.close(); } catch { /* noop */ } audioCtxRef.current = null; }
      return;
    }
    // brief gap between notes for feedback
    window.setTimeout(() => {
      if (!cancelledRef.current) playNote(nextIdx);
    }, 350);
  };

  const startSet = useCallback(async (set: SetDef, toneCtx: AudioContext | null) => {
    if (!toneCtx) { toast.error('Audio unavailable in this browser.'); return; }
    cancelledRef.current = false;
    const tonic = tonicFor(voice);
    const midiNotes = set.degrees.map((d) => tonic + d);
    setSelectedSet(set);
    setNotes(midiNotes);
    setResults(midiNotes.map(() => 'pending'));
    setCurrentIdx(-1);
    setHeldMs(0);
    setFinished(false);
    setRunId((r) => r + 1);
    setRunning(true);
    audioCtxRef.current = toneCtx;
    const micOutcome = await mic.start(80);
    if (micOutcome !== 'granted') {
      toast.error(micOutcome === 'denied' ? 'Microphone permission denied' : 'Could not start microphone');
      cleanup();
      setRunning(false);
      return;
    }
    // small delay so browser mic pipeline is fully up before first tone
    window.setTimeout(() => {
      if (!cancelledRef.current) playNote(0);
    }, 250);
  }, [voice, mic, cleanup, playNote]);

  const stopSet = useCallback(() => {
    cleanup();
    setRunning(false);
    setCurrentIdx(-1);
    setResults(notes.map((_, i) => (results[i] === 'correct' || results[i] === 'missed') ? results[i] : 'pending'));
  }, [cleanup, notes, results]);

  const backToCatalog = useCallback(() => {
    cleanup();
    setSelectedSet(null);
    setRunning(false);
    setFinished(false);
    setResults([]);
    setNotes([]);
    setCurrentIdx(-1);
  }, [cleanup]);

  // --- CATALOG VIEW ---
  if (!selectedSet) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Sets</p>
          <p className="text-sm text-slate-600">
            Pick a challenge. Each set is a sequence of notes — nail them in order. Rounds auto-advance and you'll see your progress fill in as you go.
          </p>
        </div>
        {TIER_ORDER.map((tier) => {
          const inTier = SETS.filter((s) => s.tier === tier);
          if (inTier.length === 0) return null;
          return (
            <div key={tier} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">{TIER_LABEL[tier]}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {inTier.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => {
                      const ctx = primeToneCtx();
                      void startSet(set, ctx);
                    }}
                    className="text-left rounded-xl border border-slate-200 hover:border-slate-400 bg-white p-3 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-900">{set.label}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{set.blurb}</p>
                    <p className="text-xs text-slate-500 mt-1">{set.degrees.length} notes</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // --- SET PLAYER VIEW ---
  const correctCount = results.filter((r) => r === 'correct').length;
  const missedCount = results.filter((r) => r === 'missed').length;
  const total = notes.length;
  const heldPct = Math.min(100, Math.round((heldMs / HOLD_MS_REQUIRED) * 100));
  const currentTarget = currentIdx >= 0 ? notes[currentIdx] : null;
  const liveMidi = mic.live?.midi ?? null;
  const liveCents = mic.live?.cents ?? 0;
  const centsDelta = liveMidi != null && currentTarget != null ? (liveMidi - currentTarget) * 100 + liveCents : null;
  const onPitch = centsDelta != null && Math.abs(centsDelta) <= CENTS_TOLERANCE;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">{TIER_LABEL[selectedSet.tier]}</p>
            <p className="text-lg font-semibold text-slate-900 truncate">{selectedSet.label}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={backToCatalog} className="shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1" /> Sets
          </Button>
        </div>

        {/* Pill row — one pill per note; colored by result */}
        <div key={runId} className="flex flex-wrap items-center gap-2">
          {notes.map((n, i) => {
            const r = results[i];
            const isCurrent = i === currentIdx && running;
            const base = 'inline-flex items-center justify-center h-9 min-w-[3.25rem] px-2 rounded-full text-xs font-semibold border';
            const cls =
              r === 'correct' ? 'bg-emerald-500 text-white border-emerald-500' :
              r === 'missed'  ? 'bg-rose-100 text-rose-700 border-rose-300' :
              r === 'active'  ? 'bg-slate-900 text-white border-slate-900 animate-pulse' :
              'bg-slate-100 text-slate-500 border-slate-200';
            return (
              <span key={i} className={`${base} ${cls} ${isCurrent ? 'ring-2 ring-offset-2 ring-slate-900' : ''}`}>
                {midiName(n)}
              </span>
            );
          })}
        </div>

        {/* Overall progress bar */}
        <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-[width] duration-200"
            style={{ width: `${total === 0 ? 0 : Math.round(((correctCount + missedCount) / total) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {correctCount} correct · {missedCount} missed · {total - correctCount - missedCount} to go
        </p>
      </div>

      {/* Current note panel */}
      <div className="rounded-2xl bg-white p-6 shadow-sm text-center min-h-[10rem] flex flex-col items-center justify-center">
        {!running && !finished && (
          <>
            <p className="text-sm text-slate-600 mb-3">Ready when you are.</p>
            <Button
              className="rounded-full"
              onClick={() => { const ctx = primeToneCtx(); void startSet(selectedSet, ctx); }}
            >
              <Play className="w-4 h-4 mr-1" /> Start set
            </Button>
          </>
        )}

        {running && currentTarget != null && (
          <>
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Mic className="w-3 h-3" /> Note {currentIdx + 1} of {total}
            </p>
            <p className="text-5xl font-bold text-slate-900">{midiName(currentTarget)}</p>
            <div className="mt-3 h-3 w-full max-w-xs bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-[width] duration-100 ${onPitch ? 'bg-emerald-500' : 'bg-slate-400'}`}
                style={{ width: `${heldPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 min-h-[1rem]">
              {liveMidi != null && mic.live && mic.live.clarity >= CLARITY_MIN ? (
                <>You're singing <span className="font-semibold">{midiName(liveMidi)}</span>{centsDelta != null && (<>{' '}({centsDelta > 0 ? '+' : ''}{Math.round(centsDelta)}¢)</>)}</>
              ) : (
                'Waiting for a clear tone…'
              )}
            </p>
            <Button size="sm" variant="outline" className="rounded-full mt-4" onClick={stopSet}>
              Stop set
            </Button>
          </>
        )}

        {finished && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
              {correctCount === total ? (
                <Sparkles className="w-7 h-7 text-amber-500" />
              ) : correctCount >= Math.ceil(total * 0.7) ? (
                <Check className="w-7 h-7 text-emerald-600" />
              ) : (
                <X className="w-7 h-7 text-rose-600" />
              )}
            </div>
            <p className="text-lg font-semibold text-slate-900">
              {correctCount === total ? 'Perfect!' : correctCount >= Math.ceil(total * 0.7) ? 'Nice run' : 'Try again'}
            </p>
            <p className="text-sm text-slate-600">
              {correctCount} of {total} correct
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                className="rounded-full"
                onClick={() => { const ctx = primeToneCtx(); void startSet(selectedSet, ctx); }}
              >
                <RotateCcw className="w-4 h-4 mr-1" /> Try again
              </Button>
              <Button variant="outline" className="rounded-full" onClick={backToCatalog}>
                Pick another
              </Button>
            </div>
          </>
        )}
      </div>

      {mic.permission === 'denied' && (
        <p className="text-xs text-rose-600">Microphone access is required. Grant it in your browser settings and reload.</p>
      )}
      {mic.error && running && (
        <p className="text-xs text-rose-600">Mic error: {mic.error}</p>
      )}

      {(correctCount > 0 || missedCount > 0) && (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Badge variant="outline" className="text-xs">Correct {correctCount}</Badge>
          <Badge variant="outline" className="text-xs">Missed {missedCount}</Badge>
        </div>
      )}
    </div>
  );
}
