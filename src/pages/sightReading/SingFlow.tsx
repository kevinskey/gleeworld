import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Play } from 'lucide-react';
import { useMicPitch } from '@/lib/sightReading/useMicPitch';
import { scoreAttempt, type ScoreResult, type SungNote } from '@/lib/sightReading/score';
import type { ExerciseIR } from '@/lib/sightReading/ir';
import { ResultCard } from './ResultCard';
import { NotationView } from '@/pages/notation/NotationView';
import { irToEditorScore } from '@/lib/notation/fromIR';

// The count-in is four beats. useMicPitch's beatPos clock starts (startedAt =
// ctx.currentTime) when the AudioWorklet node is constructed inside start(),
// with NO count-in offset and no way to share that clock. We deliberately run
// the count-in AFTER awaiting start() and then subtract COUNT_IN_BEATS from
// every captured beatPos before scoring — see runTake() and the report for the
// full reasoning. This aligns IR beat 0 with the exercise downbeat to within a
// few milliseconds (the residual is the gap between start() resolving and the
// count-in timeline being anchored), well under the scorer's 0.25-beat rhythm
// tolerance.
const COUNT_IN_BEATS = 4;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const midiToName = (m: number) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type Phase = 'ready' | 'priming' | 'countin' | 'singing' | 'scoring' | 'done';

/**
 * Priming + count-in tone synthesis. Uses its own short-lived AudioContext so
 * it never collides with useMicPitch's context. Plays I–IV–V–I in the key,
 * then sounds the exercise's starting pitch, so the student has the tonal
 * center and their first note before they sing.
 */
async function playPriming(ir: ExerciseIR): Promise<void> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    if (ctx.state !== 'running') await ctx.resume();
    const t0 = ctx.currentTime + 0.05;
    const third = ir.mode === 'minor' ? 3 : 4;
    // I, IV, V, I relative to the tonic (IV = +5, V = +7).
    const roots = [0, 5, 7, 0];
    const chordDur = 0.55;
    roots.forEach((root, i) => {
      const base = ir.tonicMidi + root;
      [0, third, 7].forEach((iv) => tone(ctx, midiToHz(base + iv), t0 + i * chordDur, chordDur * 0.9, 0.14));
    });
    // The student's first note, sounded alone after the cadence.
    const startAt = t0 + roots.length * chordDur + 0.15;
    tone(ctx, midiToHz(ir.notes[0].midi), startAt, 0.7, 0.22);
    const total = (startAt - ctx.currentTime + 0.9) * 1000;
    await new Promise((r) => setTimeout(r, total));
  } finally {
    ctx.close().catch(() => {});
  }
}

function tone(ctx: AudioContext, hz: number, at: number, dur: number, gain: number) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = hz;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.02);
  g.gain.setValueAtTime(gain, at + dur - 0.08);
  g.gain.linearRampToValueAtTime(0, at + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** Best-effort notation strip. Laid out from REALIZED length (sum of
 * durationBeats), never from bars × meter.beats — generated lines routinely
 * overshoot their nominal bar count, and the IR is honest about it. */
function NotationStrip({ ir }: { ir: ExerciseIR }) {
  const realized = ir.notes.reduce((s, n) => s + n.durationBeats, 0);
  // Render the line as real notation on a staff (memoized so mic-driven re-renders
  // during a take don't rebuild VexFlow ~30×/s).
  const score = useMemo(() => irToEditorScore(ir), [ir]);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <NotationView score={score} />
      <p className="mt-2 text-xs text-slate-500">
        {ir.key} {ir.mode} · {ir.meter.beats}/{ir.meter.beatType} · {ir.tempo} bpm · {realized} beats
      </p>
    </div>
  );
}

export function SingFlow({
  exercise,
  onExit,
  activityKey,
}: {
  exercise: ExerciseIR;
  onExit: () => void;
  activityKey: string;
}) {
  const mic = useMicPitch();
  const [phase, setPhase] = useState<Phase>('ready');
  const [countBeat, setCountBeat] = useState(0);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // `mic` is a fresh (memoized) object whose identity changes on nearly every
  // audio frame while singing, because `mic.live` updates that fast. Depending
  // the teardown effect on `mic` (or `mic.stop`) therefore re-runs its CLEANUP
  // on every frame — clearing the count-in/scoring timers and calling stop()
  // mid-take, so the take never completes (BUG 1). Instead we hold the latest
  // stop() in a ref and run the cleanup with an EMPTY dependency array, so it
  // fires exactly once, on unmount, and never on a re-render.
  const stopRef = useRef(mic.stop);
  stopRef.current = mic.stop;
  useEffect(
    () => () => {
      clearTimers();
      stopRef.current();
    },
    [],
  );

  const logOnce = useCallback(
    (r: ScoreResult) => {
      // Exactly one localStorage entry per completed take. No network, no DB.
      try {
        const raw = localStorage.getItem(activityKey);
        const list = raw ? JSON.parse(raw) : [];
        list.unshift({
          ts: Date.now(),
          kind: 'practiced',
          label: `${exercise.key} major · level ${exercise.difficulty} · ${r.overall}/100`,
          meta: { overall: r.overall, level: exercise.difficulty, key: exercise.key },
        });
        localStorage.setItem(activityKey, JSON.stringify(list.slice(0, 25)));
      } catch {
        /* quota / private mode — drop silently */
      }
    },
    [activityKey, exercise],
  );

  const runTake = useCallback(async () => {
    setResult(null);
    setPhase('priming');
    await playPriming(exercise);

    // Await start() so the mic clock's zero is anchored to (approximately) this
    // instant; the count-in below is measured from here and later subtracted.
    // Branch on the RETURNED outcome, not on `mic.permission`: on the first
    // attempt that state is still the pre-start() value in this closure, so a
    // denial read through it never fires (BUG 2). On anything but a live mic we
    // stop here — no count-in, no scoring, and nothing written to localStorage
    // — but the line stays on screen (and was just played), and the denied
    // banner offers the way back in. A refused mic is never a dead end.
    setPhase('countin');
    const outcome = await mic.start(exercise.tempo);
    if (outcome !== 'granted') {
      setPhase('ready');
      return;
    }

    const beatMs = (60 / exercise.tempo) * 1000;
    const realized = exercise.notes.reduce((s, n) => s + n.durationBeats, 0);

    // Audible four-beat count-in, then the exercise window.
    for (let b = 0; b < COUNT_IN_BEATS; b++) {
      timers.current.push(setTimeout(() => setCountBeat(b + 1), b * beatMs));
    }
    timers.current.push(
      setTimeout(() => {
        setPhase('singing');
        setCountBeat(0);
      }, COUNT_IN_BEATS * beatMs),
    );

    // End of take: give the last note a one-beat tail, then stop + score.
    const takeMs = (COUNT_IN_BEATS + realized + 1) * beatMs;
    timers.current.push(
      setTimeout(() => {
        setPhase('scoring');
        mic.stop();
        const raw = mic.getCaptured();
        // Shift the mic-clock timeline back by the count-in so IR beat 0 lines
        // up with the exercise downbeat, and drop anything captured during the
        // count-in itself.
        const sung: SungNote[] = raw
          .map((s) => ({ midi: s.midi, beatPos: s.beatPos - COUNT_IN_BEATS }))
          .filter((s) => s.beatPos >= -0.5);
        const r = scoreAttempt(exercise, sung);
        logOnce(r);
        setResult(r);
        setPhase('done');
      }, takeMs),
    );
  }, [exercise, mic, logOnce]);

  const restart = useCallback(() => {
    clearTimers();
    mic.stop();
    setResult(null);
    setPhase('ready');
  }, [mic]);

  if (phase === 'done' && result) {
    return <ResultCard ir={exercise} result={result} onAgain={runTake} onExit={onExit} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sing the line</h1>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Exit
        </Button>
      </div>

      <NotationStrip ir={exercise} />

      {mic.error && (
        <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          {mic.error}
        </div>
      )}

      {mic.permission === 'denied' && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          Microphone access is off — you can still see and hear the line. Enable mic to get
          scored, then tap Start take again.
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        {phase === 'ready' && (
          <Button size="lg" className="rounded-full" onClick={runTake}>
            <Play className="mr-2 h-4 w-4" /> Start take
          </Button>
        )}
        {phase === 'priming' && (
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Playing your starting pitch…
          </p>
        )}
        {phase === 'countin' && (
          <p className="text-4xl font-bold text-slate-800">{countBeat || '…'}</p>
        )}
        {phase === 'singing' && (
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Mic className="h-4 w-4" /> Sing now
            </p>
            {mic.live && (
              <p className="text-sm text-slate-600">
                {midiToName(mic.live.midi)} · {mic.live.cents >= 0 ? '+' : ''}
                {Math.round(mic.live.cents)}¢
              </p>
            )}
          </div>
        )}
        {phase === 'scoring' && (
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Scoring your take…
          </p>
        )}
      </div>

      {(phase === 'countin' || phase === 'singing') && (
        <Button variant="outline" className="w-full rounded-full" onClick={restart}>
          Stop
        </Button>
      )}
    </div>
  );
}
