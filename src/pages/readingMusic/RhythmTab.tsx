import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RHYTHM_LEVELS } from '@/lib/rhythm/pattern';
import type { RhythmPattern } from '@/lib/rhythm/pattern';
import { generatePattern } from '@/lib/rhythm/generate';
import { SYLLABLE_SYSTEMS } from '@/lib/rhythm/syllables';
import type { SyllableSystem } from '@/lib/rhythm/syllables';
import {
  gradeOnsets, expectedOnsets, PRACTICE_TOLERANCE_PCT, ASSESSMENT_TOLERANCE_PCT, TOLERANCE_FLOOR_SEC,
} from '@/lib/rhythm/grade';
import type { GradeResult } from '@/lib/rhythm/grade';
import { clickSchedule } from '@/lib/sightReading/metronome';
import { startTapSession } from '@/lib/rhythm/onsets/tap';
import type { TapSession } from '@/lib/rhythm/onsets/tap';
import { startMicOnsetSession } from '@/lib/rhythm/onsets/mic';
import type { MicOnsetSession } from '@/lib/rhythm/onsets/mic';
import { insertAttempt } from '@/lib/readingMusic/attemptsApi';
import { RhythmStrip } from './RhythmStrip';
import { RhythmResults } from './RhythmResults';
import { getAudioCtx } from './audioCtx';
import { createClapBlastRound } from '@/lib/rhythm/clapBlast';
import type { ClapBlastRound } from '@/lib/rhythm/clapBlast';
import { ClapBlastStage } from './ClapBlastStage';
import { ClapCalibration } from './ClapCalibration';

type Drill = 'steady_beat' | 'echo' | 'read_clap' | 'clap_blast';
type InputMethod = 'tap' | 'mic';
type Phase = 'idle' | 'demo' | 'countin' | 'take' | 'result';

const MEASURE_CHOICES = [2, 4, 8, 16];

const DRILLS: Array<{ id: Drill; label: string; blurb: string }> = [
  { id: 'steady_beat', label: 'Steady Beat', blurb: 'Tap along with the click.' },
  { id: 'echo', label: 'Echo', blurb: 'Listen, then clap it back.' },
  { id: 'read_clap', label: 'Read & Clap', blurb: 'Read the line, then perform it.' },
  { id: 'clap_blast', label: '💥 Clap Blast', blurb: 'Clap each note as it crosses the line!' },
];

// Short sine bursts (the playClicks envelope idiom) with an explicit start
// time so the count-in can be scheduled after an echo demo.
function burst(ctx: AudioContext, at: number, freq: number, gain: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  osc.connect(g).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.08);
}

function scheduleCountInAndClicks(
  ctx: AudioContext, startAt: number, bpm: number, countInPulses: number, exercisePulses: number, ppm: number,
): void {
  const clicks = clickSchedule({ bpm, countInBeats: countInPulses, exerciseBeats: exercisePulses, meterBeats: ppm });
  for (const c of clicks) {
    // Count-in loud so tempo is unmistakable; take clicks quiet so the open
    // (echoCancellation-off) mic doesn't hear the speaker as claps.
    const gain = c.countIn ? (c.accent ? 0.4 : 0.3) : c.accent ? 0.08 : 0.05;
    burst(ctx, startAt + c.timeSec, c.accent ? 1400 : 1000, gain);
  }
}

function schedulePatternDemo(ctx: AudioContext, pattern: RhythmPattern, spp: number, startAt: number): void {
  for (const e of pattern.events) {
    if (e.rest) continue;
    const onPulse = Math.abs(e.startPulse - Math.round(e.startPulse)) < 1e-6;
    burst(ctx, startAt + e.startPulse * spp, onPulse ? 1200 : 900, 0.3);
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function starsFor(score: number): number {
  if (score >= 95) return 3;
  if (score >= 88) return 2;
  if (score >= 80) return 1;
  return 0;
}

export function RhythmTab() {
  const [drill, setDrill] = useState<Drill>('echo');
  const [level, setLevel] = useState<number>(() => readJson('rm_rhythm_level', 1));
  const [input, setInput] = useState<InputMethod>(() => (localStorage.getItem('rm_rhythm_input') as InputMethod) || 'tap');
  const [system, setSystem] = useState<SyllableSystem>(() => (localStorage.getItem('rm_rhythm_syllables') as SyllableSystem) || 'takadimi');
  const [bpm, setBpm] = useState<number>(RHYTHM_LEVELS[0].defaultBpm);
  const [measures, setMeasures] = useState<number>(() => readJson('rm_rhythm_measures', RHYTHM_LEVELS[0].measures));
  const [assessment, setAssessment] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pattern, setPattern] = useState<RhythmPattern | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [stars, setStars] = useState<Record<number, number>>(() => readJson('rm_rhythm_stars', {}));
  const [burstId, setBurstId] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(() => {
    const v = localStorage.getItem('rm_clap_latency_ms');
    return v === null || Number.isNaN(Number(v)) ? null : Number(v);
  });
  const [calibrating, setCalibrating] = useState(false);
  const [takeT0, setTakeT0] = useState<number | null>(null);
  const roundRef = useRef<ClapBlastRound | null>(null);

  const padRef = useRef<HTMLButtonElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const sessionRef = useRef<TapSession | MicOnsetSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef(false);

  useEffect(() => { localStorage.setItem('rm_rhythm_level', JSON.stringify(level)); }, [level]);
  useEffect(() => { localStorage.setItem('rm_rhythm_input', input); }, [input]);
  useEffect(() => { localStorage.setItem('rm_rhythm_syllables', system); }, [system]);
  useEffect(() => { localStorage.setItem('rm_rhythm_stars', JSON.stringify(stars)); }, [stars]);
  useEffect(() => { localStorage.setItem('rm_rhythm_measures', JSON.stringify(measures)); }, [measures]);
  useEffect(() => {
    const lvl = RHYTHM_LEVELS.find((l) => l.id === level);
    if (lvl) setBpm(lvl.defaultBpm);
  }, [level]);

  const cancelTake = useCallback(() => {
    activeRef.current = false;
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
    sessionRef.current?.dispose();
    sessionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    roundRef.current = null;
  }, []);

  // Unmount / tab-hidden: kill the take cleanly, no partial insert.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && activeRef.current) {
        cancelTake();
        setPhase('idle');
        toast.error('Take cancelled', { description: 'The tab lost focus mid-take.' });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      cancelTake();
    };
  }, [cancelTake]);

  const currentLevel = RHYTHM_LEVELS.find((l) => l.id === level) ?? RHYTHM_LEVELS[0];

  // `inputOverride` lets a caller start a take with an input the `input` state
  // hasn't committed to yet — the mic-denied calibration fallback sets state to
  // 'tap' and starts in the same tick, so it can't read the fresh value.
  const start = useCallback(async (inputOverride?: InputMethod, assessmentOverride?: boolean) => {
    if (activeRef.current) return;
    const chosenInput: InputMethod = inputOverride ?? input;
    // Same reason as inputOverride: the Start / Take-assessment buttons set
    // this state and launch a take in one click, so this closure still holds
    // the pre-click value. Without the override the two buttons swap roles.
    const isAssessment = assessmentOverride ?? assessment;
    if (drill === 'clap_blast' && chosenInput === 'mic' && latencyMs === null) {
      setCalibrating(true);
      return;
    }
    const ctx = getAudioCtx();
    if (!ctx) { toast.error('Audio unavailable', { description: 'This browser does not support Web Audio.' }); return; }

    let effectiveInput: InputMethod = chosenInput;
    let stream: MediaStream | null = null;
    if (chosenInput === 'mic') {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        streamRef.current = stream;
      } catch {
        effectiveInput = 'tap';
        setInput('tap');
        toast.error('Mic unavailable — switched to tap input');
      }
    }

    const seed = Math.floor(Math.random() * 1e9);
    const p = drill === 'steady_beat'
      ? generatePattern(1, seed, 0, measures)
      : generatePattern(level, seed, seed % 7, measures);
    setPattern(p);
    setResult(null);

    // Single source of truth for the round's timing constants — the live round,
    // the end-of-take schedule and the saved payload must never disagree.
    const spp = 60 / bpm;
    const tolerancePct = isAssessment ? ASSESSMENT_TOLERANCE_PCT : PRACTICE_TOLERANCE_PCT;
    const tol = Math.max(tolerancePct * spp, TOLERANCE_FLOOR_SEC);
    const latencySec = drill === 'clap_blast' && effectiveInput === 'mic' ? (latencyMs ?? 0) / 1000 : 0;

    if (drill === 'clap_blast') {
      roundRef.current = createClapBlastRound({
        expected: expectedOnsets(p, spp),
        secondsPerPulse: spp,
        tolerancePct,
        latencySec,
      });
    } else {
      roundRef.current = null;
    }
    activeRef.current = true;

    const ppm = p.pulsesPerMeasure;
    const base = ctx.currentTime + 0.1;
    const demoDur = drill === 'echo' ? p.totalPulses * spp + 0.5 : 0;
    const countInStart = base + demoDur;
    const t0 = countInStart + ppm * spp;
    setTakeT0(t0);
    const takeDur = p.totalPulses * spp;

    if (drill === 'echo') {
      setPhase('demo');
      schedulePatternDemo(ctx, p, spp, base);
    } else {
      setPhase('countin');
    }
    scheduleCountInAndClicks(ctx, countInStart, bpm, ppm, p.totalPulses, ppm);

    const ms = (sec: number) => Math.max(0, (sec - ctx.currentTime) * 1000);
    if (drill === 'echo') {
      timersRef.current.push(window.setTimeout(() => { if (activeRef.current) setPhase('countin'); }, ms(countInStart)));
    }
    // Input opens just before beat zero so demo/count-in never register.
    timersRef.current.push(window.setTimeout(() => {
      if (!activeRef.current) return;
      setPhase('take');
      if (effectiveInput === 'mic' && streamRef.current) {
        const mic = startMicOnsetSession(ctx, streamRef.current, t0);
        sessionRef.current = mic;
        const meter = window.setInterval(() => {
          if (sessionRef.current === mic) setMicLevel(mic.level()); else window.clearInterval(meter);
        }, 100);
        timersRef.current.push(meter as unknown as number);
      } else if (padRef.current) {
        sessionRef.current = startTapSession(ctx, t0, padRef.current);
      }
    }, ms(t0 - 2 * tol)));

    timersRef.current.push(window.setTimeout(() => {
      if (!activeRef.current) return;
      const onsets = (sessionRef.current?.onsets ?? [])
        .filter((t) => t >= -2 * tol && t <= takeDur + 2 * tol);
      const noInput = (sessionRef.current?.onsets ?? []).length === 0;
      const graded = (() => {
        if (drill === 'clap_blast' && roundRef.current) {
          roundRef.current.tick(ctx.currentTime - t0, sessionRef.current?.onsets ?? []);
          return roundRef.current.toGradeResult();
        }
        return gradeOnsets(expectedOnsets(p, spp), onsets, { secondsPerPulse: spp, tolerancePct });
      })();
      const bestStreak = roundRef.current?.bestStreak() ?? 0;
      cancelTake();
      setTakeT0(null);
      setResult(graded);
      setPhase('result');
      setMicLevel(0);
      if (!isAssessment) {
        const earned = starsFor(graded.score);
        setStars((prev) => {
          const best = Math.max(prev[level] ?? 0, earned);
          if (earned === 3 && (prev[level] ?? 0) < 3) setBurstId((b) => b + 1);
          return { ...prev, [level]: best };
        });
      }
      const payloadActual = drill === 'clap_blast'
        ? [...graded.notes.filter((n) => n.actualSec !== null).map((n) => n.actualSec as number), ...graded.extraOnsets].sort((a, b) => a - b)
        : onsets;
      void insertAttempt({
        domain: 'rhythm',
        drill,
        mode: isAssessment ? 'assessment' : 'practice',
        level,
        score: graded.score,
        passed: graded.passed,
        payload: {
          bpm, input: effectiveInput, syllables: system, tolerancePct,
          expected: expectedOnsets(p, spp), actual: payloadActual,
          verdicts: graded.notes.map((n) => n.verdict),
          meter: p.meter, seed, measures: p.measures, ...(noInput ? { no_input: true } : {}),
          ...(drill === 'clap_blast' ? { best_streak: bestStreak } : {}),
          ...(drill === 'clap_blast' && effectiveInput === 'mic' && latencyMs !== null ? { latency_ms: latencyMs } : {}),
        },
      });
      // The last note's mic-time window closes at lastExpected + latency + 2·tol
      // and cancelTake() disposes the mic here — so the schedule has to carry the
      // same latency the round was built with, or slow devices force a miss.
    }, ms(t0 + takeDur + latencySec + 2 * tol + 0.35)));
  }, [assessment, bpm, cancelTake, drill, input, latencyMs, level, measures, system]);

  const getOnsets = useCallback(() => sessionRef.current?.onsets ?? [], []);

  const showNotation = drill !== 'echo' && drill !== 'clap_blast' && pattern && phase !== 'idle';
  const running = phase === 'demo' || phase === 'countin' || phase === 'take';
  // getAudioCtx() constructs/resumes a context — resolve it once per render,
  // and only while a take is actually on the clock.
  const stageCtx = takeT0 !== null ? getAudioCtx() : null;

  return (
    <div className="relative space-y-4">
      {burstId > 0 && <RhythmConfetti id={burstId} />}

      {/* Level journey */}
      <div className="flex flex-wrap gap-2">
        {/* Every level is selectable — stars record progress, they don't gate it. */}
        {RHYTHM_LEVELS.map((l) => {
          const s = stars[l.id] ?? 0;
          return (
            <button
              key={l.id}
              type="button"
              disabled={running}
              onClick={() => setLevel(l.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                level === l.id ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-accent'
              }`}
              title={l.label}
            >
              Level {l.id}{s > 0 ? ` ${'★'.repeat(s)}` : ''}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {DRILLS.map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={running}
                onClick={() => setDrill(d.id)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  drill === d.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-accent'
                }`}
              >
                {d.label}
              </button>
            ))}
            <span className="text-sm text-slate-500">{DRILLS.find((d) => d.id === drill)?.blurb}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="rm-input" className="text-sm text-slate-600">Input</label>
              <select
                id="rm-input"
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                value={input}
                disabled={running}
                onChange={(e) => setInput(e.target.value as InputMethod)}
              >
                <option value="tap">Tap / spacebar</option>
                <option value="mic">Clap (mic)</option>
              </select>
            </div>
            {/* The Clap Blast stage has no room for a syllable underlay, so
                during play this picker changes nothing visible. Hidden here to
                avoid an apparently-live control that does nothing. */}
            {drill !== 'clap_blast' && (
              <div className="flex items-center gap-2">
                <label htmlFor="rm-syllables" className="text-sm text-slate-600">Syllables</label>
                <select
                  id="rm-syllables"
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  value={system}
                  disabled={running}
                  onChange={(e) => setSystem(e.target.value as SyllableSystem)}
                >
                  {SYLLABLE_SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label htmlFor="rm-measures" className="text-sm text-slate-600">Measures</label>
              <select
                id="rm-measures"
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                value={measures}
                disabled={running}
                onChange={(e) => setMeasures(Number(e.target.value))}
              >
                {MEASURE_CHOICES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Tempo</span>
              <Button variant="outline" size="sm" disabled={running || bpm <= 40} onClick={() => setBpm((b) => Math.max(40, b - 5))}>−5</Button>
              <span className="w-16 text-center text-sm font-medium">{bpm} BPM</span>
              <Button variant="outline" size="sm" disabled={running || bpm >= 180} onClick={() => setBpm((b) => Math.min(180, b + 5))}>+5</Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={running} onClick={() => { setAssessment(false); void start(undefined, false); }}>
              {phase === 'result' ? 'Start again' : 'Start'}
            </Button>
            <Button
              variant="outline"
              disabled={running || (stars[level] ?? 0) < 1}
              title={(stars[level] ?? 0) < 1 ? 'Pass this level in practice first' : undefined}
              onClick={() => { setAssessment(true); void start(undefined, true); }}
            >
              Take assessment
            </Button>
            {/* Abandon a take in progress. Nothing is graded or saved — the
                finish timer is cleared by cancelTake before it can fire. */}
            {running && (
              <Button
                variant="outline"
                onClick={() => {
                  cancelTake();
                  setPhase('idle');
                  setTakeT0(null);
                  setMicLevel(0);
                  setPattern(null);
                }}
              >
                Stop
              </Button>
            )}
            {phase === 'demo' && <span className="text-sm font-medium text-sky-700">Listen…</span>}
            {phase === 'countin' && <span className="text-sm font-medium text-amber-700">Count-in…</span>}
            {phase === 'take' && <span className="text-sm font-medium text-emerald-700">Go!</span>}
          </div>

          {calibrating && (
            <ClapCalibration
              onDone={(msVal) => {
                localStorage.setItem('rm_clap_latency_ms', String(msVal));
                setLatencyMs(msVal);
                setCalibrating(false);
                toast.success(`Calibrated — your device delay is ${msVal} ms`);
              }}
              onCancel={(reason) => {
                setCalibrating(false);
                // Mic denied must never trap the player in the calibration gate:
                // fall back to tap like every other drill and run the take.
                if (reason === 'denied') {
                  setInput('tap');
                  toast.error('Mic unavailable — switched to tap input');
                  void start('tap');
                }
              }}
            />
          )}
          {drill === 'clap_blast' && input === 'mic' && latencyMs !== null && !calibrating && (
            <button
              type="button"
              disabled={running}
              onClick={() => setCalibrating(true)}
              className="text-sm text-slate-500 underline-offset-2 hover:underline"
            >
              Device delay: {latencyMs} ms — recalibrate
            </button>
          )}

          {showNotation && pattern && phase !== 'result' && <RhythmStrip pattern={pattern} system={system} />}

          {drill === 'clap_blast' && running && pattern && takeT0 !== null && stageCtx && (
            <ClapBlastStage
              pattern={pattern}
              bpm={bpm}
              ctx={stageCtx}
              t0={takeT0}
              round={roundRef.current!}
              getOnsets={getOnsets}
              countIn={phase === 'countin'}
            />
          )}

          {running && input === 'tap' && (
            <button
              ref={padRef}
              type="button"
              className="h-36 w-full select-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-lg font-medium text-slate-500 active:bg-emerald-50"
            >
              Tap here (or press Space)
            </button>
          )}
          {running && input === 'mic' && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
                <div className="h-full bg-emerald-500 transition-[width] duration-100" style={{ width: `${Math.min(100, micLevel * 400)}%` }} />
              </div>
              <p className="text-sm text-slate-500">Clap crisply near the mic.</p>
            </div>
          )}

          {phase === 'result' && pattern && result && (
            <RhythmResults
              pattern={pattern}
              system={system}
              result={result}
              bpm={bpm}
              assessment={assessment}
              onRetry={() => { setAssessment(false); void start(undefined, false); }}
              onNextLevel={result.passed && level < 8 ? () => { setLevel(level + 1); setPhase('idle'); setPattern(null); } : null}
            />
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500">
        {currentLevel.label} · {currentLevel.meters.map((m) => `${m.beats}/${m.beatType}`).join(' · ')}
      </p>
    </div>
  );
}

function RhythmConfetti({ id }: { id: number }) {
  const particles = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      key: `${id}-${i}`,
      angle: (i / 12) * Math.PI * 2,
      distance: 60 + Math.random() * 40,
      char: ['✨', '⭐', '👏', '🥁'][i % 4],
      delay: Math.random() * 40,
    })),
    [id],
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      {particles.map((p) => {
        const dx = Math.cos(p.angle) * p.distance;
        const dy = Math.sin(p.angle) * p.distance;
        return (
          <span
            key={p.key}
            className="absolute text-xl"
            style={{
              animation: `rmBurst 700ms ease-out ${p.delay}ms forwards`,
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
        @keyframes rmBurst {
          0%   { transform: translate(0,0) scale(0.5); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1.15); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
