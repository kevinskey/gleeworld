import { PASS_THRESHOLD, TOLERANCE_FLOOR_SEC } from './grade';
import type { GradeResult, NoteVerdict, Verdict } from './grade';

// Live per-note grading for the Clap Blast drill. Same tolerance model as
// gradeOnsets (tol = pct·pulse with 30ms floor, claim window 2×tol) but
// resolved incrementally so notes can explode mid-take — and, per spec,
// stray claps are recorded yet carry NO score penalty (kid-friendly;
// deliberately different from gradeOnsets' −0.25 extras rule).
//
// Grading runs in "mic time": expected times are shifted by the calibrated
// device latency, and all reported times are shifted back to musical time so
// payloads and result screens are device-independent.

export type NoteState = 'pending' | 'perfect' | 'good' | 'missed';

export interface ClapBlastEvent {
  kind: 'hit' | 'miss' | 'stray';
  noteIndex: number | null;
  grade?: 'perfect' | 'good';
  deltaSec?: number;
}

export interface ClapBlastRound {
  noteStates(): NoteState[];
  streak(): number;
  bestStreak(): number;
  score(): number;
  strayCount(): number;
  tick(nowSec: number, onsets: readonly number[]): ClapBlastEvent[];
  isFinished(): boolean;
  toGradeResult(): GradeResult;
}

export function createClapBlastRound({
  expected,
  secondsPerPulse,
  tolerancePct,
  latencySec = 0,
}: {
  expected: number[];
  secondsPerPulse: number;
  tolerancePct: number;
  latencySec?: number;
}): ClapBlastRound {
  const tol = Math.max(tolerancePct * secondsPerPulse, TOLERANCE_FLOOR_SEC);
  const window = 2 * tol;
  const shifted = expected.map((t) => t + latencySec);
  const states: NoteState[] = expected.map(() => 'pending');
  const deltas: Array<number | null> = expected.map(() => null);
  const actuals: Array<number | null> = expected.map(() => null);
  const strays: number[] = [];
  const processedOnsets = new Set<number>();
  let streak = 0;
  let bestStreak = 0;

  const points = () =>
    states.reduce((s, st) => s + (st === 'perfect' ? 1 : st === 'good' ? 0.5 : 0), 0);
  const score = () => Math.round((100 * points()) / Math.max(1, expected.length));

  return {
    noteStates: () => [...states],
    streak: () => streak,
    bestStreak: () => bestStreak,
    score,
    strayCount: () => strays.length,

    tick(nowSec, onsets) {
      const events: ClapBlastEvent[] = [];
      for (const t of onsets) {
        if (processedOnsets.has(t)) continue;
        processedOnsets.add(t);
        let best = -1;
        let bestD = Infinity;
        shifted.forEach((exp, j) => {
          if (states[j] !== 'pending') return;
          const d = Math.abs(t - exp);
          if (d <= window && d < bestD) { bestD = d; best = j; }
        });
        if (best === -1) {
          strays.push(t - latencySec);
          events.push({ kind: 'stray', noteIndex: null });
          continue;
        }
        const delta = t - shifted[best];
        const grade: 'perfect' | 'good' = Math.abs(delta) <= tol ? 'perfect' : 'good';
        states[best] = grade;
        deltas[best] = delta;
        actuals[best] = t - latencySec;
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
        events.push({ kind: 'hit', noteIndex: best, grade, deltaSec: delta });
      }
      shifted.forEach((exp, i) => {
        if (states[i] === 'pending' && nowSec > exp + window) {
          states[i] = 'missed';
          streak = 0;
          events.push({ kind: 'miss', noteIndex: i });
        }
      });
      return events;
    },

    isFinished: () => states.every((s) => s !== 'pending'),

    toGradeResult(): GradeResult {
      const notes: NoteVerdict[] = expected.map((exp, i) => {
        const st = states[i];
        const verdict: Verdict =
          st === 'perfect' ? 'on_time'
          : st === 'good' ? ((deltas[i] ?? 0) < 0 ? 'early' : 'late')
          : 'missed'; // 'missed' and (defensively) 'pending'
        return { expectedSec: exp, actualSec: actuals[i], deltaSec: deltas[i], verdict };
      });
      const s = score();
      return { notes, extraOnsets: [...strays], score: s, passed: expected.length > 0 && s >= PASS_THRESHOLD };
    },
  };
}
