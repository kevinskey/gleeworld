import type { RhythmPattern } from './pattern';

export const PASS_THRESHOLD = 80;
export const TOLERANCE_FLOOR_SEC = 0.03;
export const PRACTICE_TOLERANCE_PCT = 0.10;
export const ASSESSMENT_TOLERANCE_PCT = 0.06;

export interface GradeOptions { secondsPerPulse: number; tolerancePct: number }
export type Verdict = 'on_time' | 'early' | 'late' | 'missed';
export interface NoteVerdict { expectedSec: number; actualSec: number | null; deltaSec: number | null; verdict: Verdict }
export interface GradeResult { notes: NoteVerdict[]; extraOnsets: number[]; score: number; passed: boolean }

export function expectedOnsets(pattern: RhythmPattern, secondsPerPulse: number): number[] {
  return pattern.events.filter((e) => !e.rest).map((e) => e.startPulse * secondsPerPulse);
}

// Greedy nearest-match: each expected note claims the closest unused onset
// within 2× tolerance. |delta| ≤ tol → on_time; inside the window but outside
// tol → early/late (half credit); nothing in the window → missed. Unclaimed
// onsets (including claps during rests) are extras, −0.25 each.
export function gradeOnsets(expected: number[], actual: number[], opts: GradeOptions): GradeResult {
  const tol = Math.max(opts.tolerancePct * opts.secondsPerPulse, TOLERANCE_FLOOR_SEC);
  const window = 2 * tol;
  const used = new Array(actual.length).fill(false);
  const notes: NoteVerdict[] = expected.map((exp) => {
    let bestIdx = -1;
    let bestD = Infinity;
    actual.forEach((a, i) => {
      if (used[i]) return;
      const d = Math.abs(a - exp);
      if (d <= window && d < bestD) { bestD = d; bestIdx = i; }
    });
    if (bestIdx === -1) return { expectedSec: exp, actualSec: null, deltaSec: null, verdict: 'missed' as const };
    used[bestIdx] = true;
    const delta = actual[bestIdx] - exp;
    const verdict: Verdict = Math.abs(delta) <= tol ? 'on_time' : delta < 0 ? 'early' : 'late';
    return { expectedSec: exp, actualSec: actual[bestIdx], deltaSec: delta, verdict };
  });
  // A clap that lands outside a note's window already scored a miss — don't
  // double-charge it as an extra too. Absorb unclaimed onsets that sit within
  // half a pulse of a missed note.
  for (const n of notes) {
    if (n.verdict !== 'missed') continue;
    let bestIdx = -1;
    let bestD = 0.5 * opts.secondsPerPulse;
    actual.forEach((a, i) => {
      if (used[i]) return;
      const d = Math.abs(a - n.expectedSec);
      if (d <= bestD) { bestD = d; bestIdx = i; }
    });
    if (bestIdx !== -1) used[bestIdx] = true;
  }
  const extraOnsets = actual.filter((_, i) => !used[i]);
  const pts = notes.reduce((s, n) => s + (n.verdict === 'on_time' ? 1 : n.verdict === 'missed' ? 0 : 0.5), 0)
    - 0.25 * extraOnsets.length;
  const score = Math.max(0, Math.round((100 * Math.max(0, pts)) / Math.max(1, expected.length)));
  const passed = expected.length > 0 && score >= PASS_THRESHOLD;
  return { notes, extraOnsets, score, passed };
}
