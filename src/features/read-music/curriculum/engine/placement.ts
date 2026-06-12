import type { Question } from './types';
import { buildUnitQuiz } from './quiz';

export const PER_LEVEL = 6;
export const LEVEL_PASS_PCT = 70;

/** Units sampled per level: early, middle, and late units for a quick spread. */
const SAMPLE_UNITS: Record<number, number[]> = {
  1: [1, 2, 4, 6, 7],
  2: [1, 3, 4, 6, 7],
  3: [1, 3, 4, 5, 6],
  4: [1, 2, 4, 7, 8],
};

/** 24 questions, 6 per level, ordered level 1 → 4. */
export function buildPlacementTest(): Question[] {
  const questions: Question[] = [];
  for (const levelId of [1, 2, 3, 4]) {
    const pool: Question[] = [];
    for (const unit of SAMPLE_UNITS[levelId]) {
      pool.push(...buildUnitQuiz(levelId, unit).slice(0, 3));
    }
    // avoid audio/rhythm in placement: keep it quick and quiet
    const quiet = pool.filter((q) => q.kind !== 'audio' && q.kind !== 'rhythm');
    const shuffled = quiet.sort(() => Math.random() - 0.5);
    questions.push(...shuffled.slice(0, PER_LEVEL));
  }
  return questions;
}

export type PlacementResult = {
  placedLevel: number;
  perLevel: { level: number; correct: number; total: number; pct: number }[];
};

export function gradePlacement(answers: boolean[]): PlacementResult {
  const perLevel = [1, 2, 3, 4].map((level, i) => {
    const slice = answers.slice(i * PER_LEVEL, (i + 1) * PER_LEVEL);
    const correct = slice.filter(Boolean).length;
    return { level, correct, total: slice.length, pct: slice.length ? Math.round((correct / slice.length) * 100) : 0 };
  });
  let placedLevel = 1;
  for (const l of perLevel) {
    if (l.pct >= LEVEL_PASS_PCT) placedLevel = Math.min(l.level + 1, 4);
    else break;
  }
  return { placedLevel, perLevel };
}
