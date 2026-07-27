import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Mic, Check, X, Flame, Timer, Sparkles, TrendingUp, Music2, Zap, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Voice } from '@/lib/sightReading/generate';
import { useMicPitch } from '@/lib/sightReading/useMicPitch';
import { supabase } from '@/integrations/supabase/client';
import { PitchSetPlayer } from './PitchSetPlayer';

// Voice tessituras. MIDI note numbers (C4 = 60).
const VOICE_RANGE: Record<Voice, [number, number]> = {
  soprano: [60, 81],  // C4–A5
  alto:    [55, 76],  // G3–E5
  tenor:   [48, 67],  // C3–G4
  bass:    [40, 60],  // E2–C4
};

// Diatonic scale steps from tonic (major). Scale Climber walks these.
const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];
// Interval Training picks one of these semitone jumps each round.
const INTERVAL_JUMPS = [1, 2, 3, 4, 5, 7, 12]; // m2, M2, m3, M3, P4, P5, P8

const HOLD_MS_REQUIRED = 2000;
const LISTEN_MS = 4000;
const TIME_ATTACK_MS = 60_000;
const TONE_GAIN = 0.14;
const CLARITY_MIN = 0.7;

type Mode = 'random' | 'interval' | 'scale' | 'time_attack' | 'precision' | 'sets';
type Phase = 'idle' | 'listening' | 'result';
type Outcome = 'correct' | 'missed';

interface ModeInfo {
  id: Mode;
  label: string;
  icon: typeof Play;
  blurb: string;
}
const MODES: ModeInfo[] = [
  { id: 'sets',        label: 'Sets',         icon: ListMusic,  blurb: 'Curated multi-note challenges — pick a set and see your progress fill in.' },
  { id: 'random',      label: 'Random',       icon: Music2,     blurb: 'A note from your range each round.' },
  { id: 'interval',    label: 'Intervals',    icon: TrendingUp, blurb: 'Next note jumps m2 – octave from the last correct.' },
  { id: 'scale',       label: 'Scale Climber',icon: TrendingUp, blurb: 'Climb the major scale one step at a time. Miss = restart.' },
  { id: 'time_attack', label: 'Time Attack',  icon: Timer,      blurb: '60 seconds. Match as many as you can.' },
  { id: 'precision',   label: 'Precision',    icon: Zap,        blurb: 'Tight tolerance (±25¢). Advanced.' },
];

interface Attempt {
  targetMidi: number;
  sungMidi: number | null;
  centsOff: number | null;
  outcome: Outcome;
  heldMs: number;
}

const MIDI_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiName(m: number): string {
  return `${MIDI_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
}
function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}
function clampToRange(m: number, [lo, hi]: [number, number]): number {
  return Math.max(lo, Math.min(hi, m));
}

// Target picker per mode. `lastCorrect` = last matched target (null if none),
// `scaleStep` = index into MAJOR_SCALE_STEPS for Scale Climber. Returns the
// next MIDI target AND (for Scale Climber) the next scaleStep index.
function pickTargetForMode(
  mode: Mode,
  voice: Voice,
  streak: number,
  lastTarget: number | null,
  lastCorrect: number | null,
  scaleStep: number,
): { target: number; nextScaleStep: number } {
  const [lo, hi] = VOICE_RANGE[voice];
  const mid = Math.round((lo + hi) / 2);

  if (mode === 'scale') {
    const tonic = clampToRange(60 + ((mid - 60) % 12), [lo, hi]); // C4-nearest tonic in range
    const step = scaleStep % MAJOR_SCALE_STEPS.length;
    const target = clampToRange(tonic + MAJOR_SCALE_STEPS[step], [lo, hi]);
    return { target, nextScaleStep: step + 1 };
  }

  if (mode === 'interval' && lastCorrect != null) {
    const jump = INTERVAL_JUMPS[Math.floor(Math.random() * INTERVAL_JUMPS.length)];
    const direction = Math.random() < 0.5 ? -1 : 1;
    const candidate = clampToRange(lastCorrect + jump * direction, [lo, hi]);
    // If clamp landed on same note (edge of range), flip direction.
    const target = candidate === lastCorrect
      ? clampToRange(lastCorrect - jump * direction, [lo, hi])
      : candidate;
    return { target, nextScaleStep: scaleStep };
  }

  // Random / precision / time_attack / interval-first-round: same widening
  // logic — start narrow, widen as streak grows.
  const halfWidth = streak < 3 ? 3 : streak < 8 ? Math.round((hi - lo) / 3) : Math.round((hi - lo) / 2);
  const rangeLo = Math.max(lo, mid - halfWidth);
  const rangeHi = Math.min(hi, mid + halfWidth);
  let target: number;
  let tries = 0;
  do {
    target = rangeLo + Math.floor(Math.random() * (rangeHi - rangeLo + 1));
    tries++;
  } while (target === lastTarget && tries < 5);
  return { target, nextScaleStep: scaleStep };
}

// User-gesture-safe AudioContext creator. Called synchronously from onClick.
function primeToneCtx(): AudioContext | null {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  if (ctx.state === 'suspended') { void ctx.resume(); }
  return ctx;
}

function startSustainedTone(ctx: AudioContext, midi: number, durationMs: number): () => Promise<void> {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = midiToHz(midi);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(TONE_GAIN, t + 0.03);
  g.gain.setValueAtTime(TONE_GAIN, t + (durationMs - 150) / 1000);
  g.gain.linearRampToValueAtTime(0, t + durationMs / 1000);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + durationMs / 1000 + 0.1);
  let stopped = false;
  return async () => {
    if (stopped) return;
    stopped = true;
    try {
      const now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.stop(now + 0.1);
      await new Promise((r) => setTimeout(r, 120));
    } catch { /* already stopped */ }
    try { await ctx.close(); } catch { /* already closed */ }
  };
}

// Short "correct" chime — major-triad arpeggio, 260ms total. Uses its own
// tiny ctx so it doesn't interfere with the reference-tone ctx lifecycle.
function playCorrectChime(rootMidi: number): void {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const notes = [rootMidi, rootMidi + 4, rootMidi + 7]; // I, iii, V
  const t0 = ctx.currentTime + 0.02;
  notes.forEach((n, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(n);
    const start = t0 + i * 0.06;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.18, start + 0.02);
    g.gain.linearRampToValueAtTime(0, start + 0.22);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.25);
  });
  setTimeout(() => { try { void ctx.close(); } catch { /* noop */ } }, 350);
}

// Emoji burst on Correct. 10 particles fly outward via CSS keyframe.
function ConfettiBurst({ id }: { id: number }) {
  const particles = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      key: `${id}-${i}`,
      angle: (i / 12) * Math.PI * 2,
      distance: 60 + Math.random() * 40,
      char: ['✨', '⭐', '🎵', '🎶'][i % 4],
      delay: Math.random() * 40,
    })),
    [id],
  );
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p) => {
        const dx = Math.cos(p.angle) * p.distance;
        const dy = Math.sin(p.angle) * p.distance;
        return (
          <span
            key={p.key}
            className="absolute text-xl"
            style={{
              animation: `pmBurst 700ms ease-out ${p.delay}ms forwards`,
              // pass dx/dy via CSS custom properties consumed by the keyframe
              ['--dx' as string]: `${dx}px`,
              ['--dy' as string]: `${dy}px`,
              opacity: 0,
            }}
          >
            {p.char}
          </span>
        );
      })}
      <style>{`
        @keyframes pmBurst {
          0%   { transform: translate(0,0) scale(0.5); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1.15); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

interface Props {
  voice: Voice;
}

export function PitchMatchTab({ voice }: Props) {
  const mic = useMicPitch();
  // Sets is the primary gamified experience. Free-play modes (random,
  // interval, scale, time_attack, precision) live in a collapsible below.
  const [mode, setMode] = useState<Mode>('sets');
  const [freePlayOpen, setFreePlayOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [target, setTarget] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState<number | null>(null);
  const [scaleStep, setScaleStep] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<Outcome | null>(null);
  const [lastCentsOff, setLastCentsOff] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreakSession, setBestStreakSession] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [heldMs, setHeldMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [burstId, setBurstId] = useState(0);
  // Time Attack session timing.
  const [taRemaining, setTaRemaining] = useState<number | null>(null);
  const [taScore, setTaScore] = useState<{ correct: number; total: number } | null>(null);
  const taEndAtRef = useRef<number | null>(null);
  const taTickRef = useRef<number | null>(null);

  const heldStartRef = useRef<number | null>(null);
  const listenTimeoutRef = useRef<number | null>(null);
  const holdCheckRef = useRef<number | null>(null);
  const stopToneRef = useRef<null | (() => Promise<void>)>(null);

  // Ref mirrors — the setInterval + setTimeout scheduled at start of listening
  // must read the LATEST pitch/target/mode, not the closure snapshot.
  const micLiveRef = useRef<typeof mic.live>(null);
  useEffect(() => { micLiveRef.current = mic.live; }, [mic.live]);
  const targetRef = useRef<number | null>(null);
  useEffect(() => { targetRef.current = target; }, [target]);
  const modeRef = useRef<Mode>('random');
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const stopEverything = useCallback(() => {
    if (listenTimeoutRef.current) { clearTimeout(listenTimeoutRef.current); listenTimeoutRef.current = null; }
    if (holdCheckRef.current) { clearInterval(holdCheckRef.current); holdCheckRef.current = null; }
    if (stopToneRef.current) { void stopToneRef.current(); stopToneRef.current = null; }
    mic.stop();
    heldStartRef.current = null;
    setHeldMs(0);
  }, [mic]);

  // Unmount only — see previous fix rationale.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    stopEverything();
    if (taTickRef.current) { clearInterval(taTickRef.current); taTickRef.current = null; }
  }, []);

  const persistAttempt = useCallback(async (a: Attempt) => {
    const { error } = await supabase.from('gw_pitch_match_attempts').insert({
      voice,
      mode,
      target_midi: a.targetMidi,
      sung_midi: a.sungMidi,
      cents_off: a.centsOff,
      matched: a.outcome === 'correct',
      held_ms: a.heldMs,
    });
    if (error) {
      toast.error('Attempt not saved', { description: error.message });
    }
  }, [voice, mode]);

  // finish uses refs so late timers work correctly.
  const finishRef = useRef<((outcome: Outcome, heldMsFinal: number) => void) | null>(null);
  finishRef.current = (outcome: Outcome, heldMsFinal: number) => {
    const currentTarget = targetRef.current;
    if (currentTarget == null) return;
    const currentMode = modeRef.current;
    const l = micLiveRef.current;
    const sungMidi = l ? l.midi : null;
    const rawCentsOff = l ? Math.round((l.midi - currentTarget) * 100 + l.cents) : null;
    const attempt: Attempt = {
      targetMidi: currentTarget,
      sungMidi,
      centsOff: rawCentsOff,
      outcome,
      heldMs: heldMsFinal,
    };
    setAttempts((prev) => [attempt, ...prev].slice(0, 20));
    setLastOutcome(outcome);
    setLastCentsOff(rawCentsOff);

    if (outcome === 'correct') {
      setLastCorrect(currentTarget);
      // Juice: chime + confetti + streak fire + milestone toasts.
      playCorrectChime(currentTarget);
      setBurstId((b) => b + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreakSession((b) => Math.max(b, next));
        if (next === 5)  toast.success('5 in a row!');
        if (next === 10) toast.success('10-streak!', { description: 'You are on fire.' });
        if (next === 25) toast.success('25-streak!', { description: 'Incredible ear.' });
        if (next === 50) toast.success('50-streak!', { description: 'Legendary.' });
        return next;
      });
      if (currentMode === 'scale') setScaleStep((s) => s + 1);
    } else {
      setStreak(0);
      if (currentMode === 'scale') setScaleStep(0); // Scale Climber restarts on miss.
    }

    setPhase('result');
    stopEverything();
    void persistAttempt(attempt);

    // Time Attack: auto-advance to next round if time remains.
    if (currentMode === 'time_attack' && taEndAtRef.current != null) {
      const remaining = taEndAtRef.current - performance.now();
      setTaScore((s) => ({
        correct: (s?.correct ?? 0) + (outcome === 'correct' ? 1 : 0),
        total: (s?.total ?? 0) + 1,
      }));
      if (remaining > 400) {
        window.setTimeout(() => {
          const ctx = primeToneCtx();
          startRoundRef.current?.(ctx);
        }, 250);
      }
    }
  };
  const finish = useCallback((outcome: Outcome, heldMsFinal: number) => {
    finishRef.current?.(outcome, heldMsFinal);
  }, []);

  // Ref to startRound so Time Attack's auto-advance (inside finishRef) can
  // invoke the latest startRound without a circular useCallback dep.
  const startRoundRef = useRef<((ctx: AudioContext | null) => Promise<void>) | null>(null);

  const startRound = useCallback(async (toneCtx: AudioContext | null) => {
    if (busy) return;
    setBusy(true);
    setLastOutcome(null);
    setLastCentsOff(null);
    setHeldMs(0);
    const currentTolerance = mode === 'precision' ? 25 : 50;

    const { target: newTarget, nextScaleStep } = pickTargetForMode(
      mode, voice, streak, target, lastCorrect, scaleStep,
    );
    // Only Scale Climber consumes scaleStep. Preserve for others.
    if (mode === 'scale') setScaleStep(nextScaleStep - 1); // rewind: increment happens on 'correct' finish
    setTarget(newTarget);
    setPhase('listening');
    if (!toneCtx) {
      toast.error('Audio unavailable in this browser.');
      setPhase('idle'); setTarget(null); setBusy(false); return;
    }
    const outcome = await mic.start(80);
    if (outcome !== 'granted') {
      toast.error(outcome === 'denied' ? 'Microphone permission denied' : 'Could not start microphone');
      try { await toneCtx.close(); } catch { /* noop */ }
      setPhase('idle'); setTarget(null); setBusy(false); return;
    }
    try {
      // Time Attack: shorter tone (2.5s) so rounds cycle faster.
      const toneDuration = mode === 'time_attack' ? 2500 : LISTEN_MS;
      stopToneRef.current = startSustainedTone(toneCtx, newTarget, toneDuration);
    } catch {
      toast.error('Audio blocked. Enable sound and try again.');
      mic.stop();
      try { await toneCtx.close(); } catch { /* noop */ }
      setPhase('idle'); setTarget(null); setBusy(false); return;
    }
    heldStartRef.current = null;
    holdCheckRef.current = window.setInterval(() => {
      const l = micLiveRef.current;
      if (!l || l.clarity < CLARITY_MIN) {
        heldStartRef.current = null; setHeldMs(0); return;
      }
      const centsDiff = Math.abs((l.midi - newTarget) * 100 + l.cents);
      if (centsDiff <= currentTolerance) {
        if (heldStartRef.current == null) heldStartRef.current = performance.now();
        const held = performance.now() - heldStartRef.current;
        setHeldMs(held);
        if (held >= HOLD_MS_REQUIRED) finish('correct', Math.round(held));
      } else {
        heldStartRef.current = null; setHeldMs(0);
      }
    }, 80);
    const roundWindow = mode === 'time_attack' ? 3000 : LISTEN_MS;
    listenTimeoutRef.current = window.setTimeout(() => finish('missed', 0), roundWindow);
    setBusy(false);
  }, [busy, mode, voice, streak, target, lastCorrect, scaleStep, mic, finish]);
  startRoundRef.current = startRound;

  const startTimeAttack = useCallback((toneCtx: AudioContext | null) => {
    setTaScore({ correct: 0, total: 0 });
    setStreak(0);
    setBestStreakSession(0);
    setAttempts([]);
    setLastCorrect(null);
    taEndAtRef.current = performance.now() + TIME_ATTACK_MS;
    setTaRemaining(TIME_ATTACK_MS);
    if (taTickRef.current) clearInterval(taTickRef.current);
    taTickRef.current = window.setInterval(() => {
      if (taEndAtRef.current == null) return;
      const rem = taEndAtRef.current - performance.now();
      if (rem <= 0) {
        setTaRemaining(0);
        if (taTickRef.current) { clearInterval(taTickRef.current); taTickRef.current = null; }
        taEndAtRef.current = null;
        stopEverything();
        setPhase('idle');
      } else {
        setTaRemaining(rem);
      }
    }, 200);
    void startRound(toneCtx);
  }, [startRound, stopEverything]);

  const totalAttempts = attempts.length;
  const correctCount = attempts.filter(a => a.outcome === 'correct').length;
  const accuracyPct = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
  const heldPct = Math.min(100, Math.round((heldMs / HOLD_MS_REQUIRED) * 100));
  const liveMidi = mic.live?.midi ?? null;
  const liveCents = mic.live?.cents ?? 0;
  const centsDelta = liveMidi != null && target != null ? (liveMidi - target) * 100 + liveCents : null;
  const currentTolerance = mode === 'precision' ? 25 : 50;
  const onPitch = centsDelta != null && Math.abs(centsDelta) <= currentTolerance;
  const [voiceLo, voiceHi] = VOICE_RANGE[voice];
  const activeMode = MODES.find((m) => m.id === mode)!;
  const streakDisplay = streak >= 3 ? `🔥 ${streak}` : `${streak}`;

  const inTimeAttack = mode === 'time_attack' && taRemaining != null && taRemaining > 0;

  // Free-play modes (all except 'sets') — shown inside the collapsible.
  const freePlayModes = MODES.filter((m) => m.id !== 'sets');
  const isFreePlay = mode !== 'sets';

  return (
    <div className="space-y-4">
      {/* Sets is the primary experience — its own catalog + player. */}
      {mode === 'sets' && <PitchSetPlayer voice={voice} />}

      {/* Free-play drawer: collapsed by default. When expanded and a
          free-play mode is selected, the single-note game panel below
          renders that mode. */}
      <div className="rounded-2xl bg-white shadow-sm">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3"
          onClick={() => {
            const next = !freePlayOpen;
            setFreePlayOpen(next);
            // If closing, snap back to Sets. If opening while on Sets,
            // pre-select Random so the user sees something meaningful.
            if (!next) setMode('sets');
            else if (mode === 'sets') setMode('random');
          }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Free play {isFreePlay ? '· ' + MODES.find((m) => m.id === mode)?.label : ''}
          </span>
          <span className="text-xs text-slate-500">{freePlayOpen ? '▾' : '▸'}</span>
        </button>
        {freePlayOpen && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {freePlayModes.map((m) => {
                const Icon = m.icon;
                const selected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (busy || phase === 'listening') return;
                      setMode(m.id);
                      setStreak(0);
                      setScaleStep(0);
                      setLastCorrect(null);
                      setTarget(null);
                      setTaScore(null);
                      setTaRemaining(null);
                      if (taTickRef.current) { clearInterval(taTickRef.current); taTickRef.current = null; }
                      taEndAtRef.current = null;
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                    disabled={busy || phase === 'listening'}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">{activeMode.blurb}</p>
          </div>
        )}
      </div>

      {isFreePlay && (
      <>
      {/* Main game panel */}
      <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Pitch Match · {activeMode.label}</p>
            <p className="text-sm text-slate-600">Voice: {voice} · Range {midiName(voiceLo)}–{midiName(voiceHi)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${streak >= 3 ? 'border-orange-300 text-orange-700 bg-orange-50' : ''}`}>
              <Flame className={`w-3.5 h-3.5 mr-1 ${streak >= 3 ? 'text-orange-500' : 'text-slate-400'}`} />
              Streak {streakDisplay}
            </Badge>
            <Badge variant="outline" className="text-xs">{correctCount}/{totalAttempts} · {accuracyPct}%</Badge>
            {bestStreakSession > 0 && (
              <Badge variant="outline" className="text-xs">Best {bestStreakSession}</Badge>
            )}
          </div>
        </div>

        {/* Time Attack HUD */}
        {mode === 'time_attack' && (taRemaining != null || taScore != null) && (
          <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-sm">
            <span className="text-slate-700">
              <Timer className="w-4 h-4 inline mr-1" />
              {taRemaining != null ? `${(taRemaining / 1000).toFixed(1)}s` : 'Done'}
            </span>
            {taScore && (
              <span className="text-slate-700">
                {taScore.correct} correct · {taScore.total} tries
              </span>
            )}
          </div>
        )}

        <div className="relative rounded-xl bg-slate-50 border p-6 min-h-[12rem] flex flex-col items-center justify-center text-center overflow-hidden">
          {burstId > 0 && lastOutcome === 'correct' && phase === 'result' && (
            <ConfettiBurst id={burstId} />
          )}

          {phase === 'idle' && (
            <>
              <p className="text-sm text-slate-600 mb-3">
                {mode === 'time_attack' ? (
                  <>60 seconds. Match as many as you can. Rounds auto-advance.</>
                ) : mode === 'scale' ? (
                  <>Climb the major scale one step at a time. Miss a note and start over.</>
                ) : mode === 'precision' ? (
                  <>±25 cent tolerance. Hold for {HOLD_MS_REQUIRED/1000}s.</>
                ) : (
                  <>The tone plays for {LISTEN_MS/1000}s — sing along, match, hold {HOLD_MS_REQUIRED/1000}s to score.</>
                )}
              </p>
              <Button
                size="lg"
                className="rounded-full"
                onClick={() => {
                  const ctx = primeToneCtx();
                  if (mode === 'time_attack') startTimeAttack(ctx);
                  else void startRound(ctx);
                }}
                disabled={busy}
              >
                <Play className="w-4 h-4 mr-1" />
                {mode === 'time_attack'
                  ? (taScore ? 'Play again' : 'Start Time Attack')
                  : (target == null ? 'Start pitch match' : 'Try again')}
              </Button>
              {mode === 'time_attack' && taScore && taRemaining === 0 && (
                <p className="text-sm text-slate-700 mt-3">
                  <Sparkles className="w-4 h-4 inline mr-1 text-amber-500" />
                  {taScore.correct} correct in 60 seconds — best streak {bestStreakSession}.
                </p>
              )}
            </>
          )}

          {phase === 'listening' && target != null && (
            <>
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <Mic className="w-3 h-3" /> Sing along with the tone
              </p>
              <p className="text-5xl font-bold text-slate-900">{midiName(target)}</p>
              <div className="mt-3 h-4 w-full max-w-xs bg-slate-200 rounded-full overflow-hidden">
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
              {!inTimeAttack && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full mt-4"
                  onClick={() => { stopEverything(); setPhase('idle'); setTarget(null); setBusy(false); }}
                >
                  Stop
                </Button>
              )}
            </>
          )}

          {phase === 'result' && target != null && (
            <>
              {lastOutcome === 'correct' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                    <Check className="w-7 h-7 text-emerald-600" />
                  </div>
                  <p className="text-lg font-semibold text-emerald-700">Correct!</p>
                  <p className="text-xs text-slate-600">
                    You held {midiName(target)}{lastCentsOff != null && (<> at {lastCentsOff > 0 ? '+' : ''}{lastCentsOff}¢</>)}.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-2">
                    <X className="w-7 h-7 text-rose-600" />
                  </div>
                  <p className="text-lg font-semibold text-rose-700">Missed</p>
                  <p className="text-xs text-slate-600">
                    Target was {midiName(target)}. {lastCentsOff != null ? (<>You landed on {lastCentsOff > 0 ? '+' : ''}{lastCentsOff}¢.</>) : 'No clear tone detected.'}
                  </p>
                </>
              )}
              {!inTimeAttack && (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => { const ctx = primeToneCtx(); void startRound(ctx); }}
                    disabled={busy}
                    className="rounded-full"
                  >
                    <Play className="w-4 h-4 mr-1" /> Next
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { stopEverything(); setPhase('idle'); setTarget(null); setBusy(false); }}
                    className="rounded-full"
                  >
                    Stop
                  </Button>
                </div>
              )}
              {inTimeAttack && (
                <p className="text-xs text-slate-500 mt-2">Next up…</p>
              )}
            </>
          )}
        </div>

        {mic.permission === 'denied' && (
          <p className="text-xs text-rose-600">Microphone access is required. Grant it in your browser settings and reload.</p>
        )}
        {mic.error && phase !== 'idle' && (
          <p className="text-xs text-rose-600">Mic error: {mic.error}</p>
        )}
      </div>

      {attempts.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Recent attempts</p>
          <ul className="divide-y divide-slate-100">
            {attempts.map((a, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-900">Target {midiName(a.targetMidi)}</span>
                <span className="text-slate-600 text-xs">
                  {a.sungMidi != null ? midiName(a.sungMidi) : '—'}
                  {a.centsOff != null && (<>{' '}({a.centsOff > 0 ? '+' : ''}{a.centsOff}¢)</>)}
                </span>
                {a.outcome === 'correct' ? (
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">Correct</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-rose-600 border-rose-200">Missed</Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      </>
      )}
    </div>
  );
}
