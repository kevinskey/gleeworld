// End-to-end test using MUS 070's real seeded category weights.
// Categories fetched from production on 2026-07-25 via MCP:
//   Assignments 20 · Quizzes 10 · Tests 15 · Discussions 5 ·
//   Midterm 15 · Final Exam 20 · Group Assignment 10 · Special 5
//
// Every scenario in this file was hand-computed first, then verified
// against the formula. If the formula changes, hand-recompute the
// expectations — do NOT edit them to match a new formula output.

import { describe, it, expect } from 'vitest';
import {
  computeCourseGrade,
  formatGradePct,
  letterGrade,
  type GradeCategory,
  type GradeSubmission,
} from './computeCourseGrade';

// Snapshot of MUS 070's seeded weights (see migration 20260725230000).
const MUS_070_CATEGORIES: GradeCategory[] = [
  { key: 'assignments',        label: 'Assignments',        weightPct: 20, dropLowest: 0 },
  { key: 'quizzes',            label: 'Quizzes',            weightPct: 10, dropLowest: 0 },
  { key: 'tests',              label: 'Tests',              weightPct: 15, dropLowest: 0 },
  { key: 'discussions',        label: 'Discussions',        weightPct:  5, dropLowest: 0 },
  { key: 'midterm',            label: 'Midterm',            weightPct: 15, dropLowest: 0 },
  { key: 'final_exam',         label: 'Final Exam',         weightPct: 20, dropLowest: 0 },
  { key: 'group_assignment',   label: 'Group Assignment',   weightPct: 10, dropLowest: 0 },
  { key: 'special_assignment', label: 'Special Assignment', weightPct:  5, dropLowest: 0 },
];

describe('MUS 070 grading — production weight profile', () => {
  it('strong all-around student: 90% in every category → final = 90', () => {
    const subs: GradeSubmission[] = MUS_070_CATEGORIES.map((c) => ({
      categoryKey: c.key,
      earned: 90,
      possible: 100,
    }));
    const result = computeCourseGrade(subs, MUS_070_CATEGORIES);
    expect(result.finalScore).toBeCloseTo(90, 5);
    expect(result.activeWeightPct).toBe(100);
    expect(letterGrade(result.finalScore)).toBe('A-');
  });

  it('perfect score: 100% everywhere → 100 → A', () => {
    const subs: GradeSubmission[] = MUS_070_CATEGORIES.map((c) => ({
      categoryKey: c.key,
      earned: 100,
      possible: 100,
    }));
    const result = computeCourseGrade(subs, MUS_070_CATEGORIES);
    expect(result.finalScore).toBeCloseTo(100, 5);
    expect(letterGrade(result.finalScore)).toBe('A');
  });

  it('mid-semester rehearsal grade — only Assignments + Quizzes have grades', () => {
    // Only 20 + 10 = 30% of the semester's weight is populated. The
    // rest is null (not graded yet) and drops out of the denominator.
    // Assignments 88, Quizzes 92 → weighted over 30 = (88·20 + 92·10)/30
    //   = (1760 + 920) / 30 = 2680/30 = 89.333…
    const subs: GradeSubmission[] = [
      { categoryKey: 'assignments', earned: 88, possible: 100 },
      { categoryKey: 'quizzes',     earned: 92, possible: 100 },
    ];
    const result = computeCourseGrade(subs, MUS_070_CATEGORIES);
    expect(result.finalScore).toBeCloseTo(89.333, 2);
    expect(result.activeWeightPct).toBe(30);
    // Categories with no graded work still appear in the summary, just null.
    const finalExam = result.categories.find((c) => c.key === 'final_exam')!;
    expect(finalExam.score).toBeNull();
    expect(finalExam.countedSubmissions).toBe(0);
  });

  it('struggles on tests, aces performance work — 20-weight tests hurt less than 20-weight final', () => {
    // Assignments 95, Quizzes 88, Tests 65, Discussions 100, Midterm 78,
    // Final Exam 92, Group 95, Special 100.
    // final = 95·0.20 + 88·0.10 + 65·0.15 + 100·0.05 + 78·0.15 + 92·0.20 + 95·0.10 + 100·0.05
    //       = 19.00 + 8.80 + 9.75 + 5.00 + 11.70 + 18.40 + 9.50 + 5.00
    //       = 87.15
    const subs: GradeSubmission[] = [
      { categoryKey: 'assignments',        earned: 95,  possible: 100 },
      { categoryKey: 'quizzes',            earned: 88,  possible: 100 },
      { categoryKey: 'tests',              earned: 65,  possible: 100 },
      { categoryKey: 'discussions',        earned: 100, possible: 100 },
      { categoryKey: 'midterm',            earned: 78,  possible: 100 },
      { categoryKey: 'final_exam',         earned: 92,  possible: 100 },
      { categoryKey: 'group_assignment',   earned: 95,  possible: 100 },
      { categoryKey: 'special_assignment', earned: 100, possible: 100 },
    ];
    const result = computeCourseGrade(subs, MUS_070_CATEGORIES);
    expect(result.finalScore).toBeCloseTo(87.15, 2);
    expect(letterGrade(result.finalScore)).toBe('B+');
  });

  it('excused midterm — excluded from calc, does not zero the student', () => {
    // Student had a documented absence for the midterm. Excused rows
    // must NOT count as zero; midterm weight is redistributed.
    // Post-excusal active weight = 100 - 15 = 85.
    // Everyone else at 85%.
    const subs: GradeSubmission[] = [
      { categoryKey: 'assignments',        earned: 85, possible: 100 },
      { categoryKey: 'quizzes',            earned: 85, possible: 100 },
      { categoryKey: 'tests',              earned: 85, possible: 100 },
      { categoryKey: 'discussions',        earned: 85, possible: 100 },
      { categoryKey: 'midterm',            earned: 0,  possible: 100, excused: true },
      { categoryKey: 'final_exam',         earned: 85, possible: 100 },
      { categoryKey: 'group_assignment',   earned: 85, possible: 100 },
      { categoryKey: 'special_assignment', earned: 85, possible: 100 },
    ];
    const result = computeCourseGrade(subs, MUS_070_CATEGORIES);
    expect(result.finalScore).toBeCloseTo(85, 5);
    expect(result.activeWeightPct).toBe(85);
    const midterm = result.categories.find((c) => c.key === 'midterm')!;
    expect(midterm.score).toBeNull();
  });

  it('zero on a quiz (not excused) counts against the student', () => {
    // Two quizzes: 10/10 and 0/10. Category avg = 10/20 = 50%.
    // All other categories at 100%. Active weight = 100.
    // final = 100·0.20 + 50·0.10 + 100·0.15 + 100·0.05 + 100·0.15
    //       + 100·0.20 + 100·0.10 + 100·0.05
    //       = 95.0
    const subs: GradeSubmission[] = [
      { categoryKey: 'assignments',        earned: 100, possible: 100 },
      { categoryKey: 'quizzes',            earned: 10,  possible: 10 },
      { categoryKey: 'quizzes',            earned: 0,   possible: 10 },
      { categoryKey: 'tests',              earned: 100, possible: 100 },
      { categoryKey: 'discussions',        earned: 100, possible: 100 },
      { categoryKey: 'midterm',            earned: 100, possible: 100 },
      { categoryKey: 'final_exam',         earned: 100, possible: 100 },
      { categoryKey: 'group_assignment',   earned: 100, possible: 100 },
      { categoryKey: 'special_assignment', earned: 100, possible: 100 },
    ];
    const result = computeCourseGrade(subs, MUS_070_CATEGORIES);
    expect(result.finalScore).toBeCloseTo(95, 5);
    const quizzes = result.categories.find((c) => c.key === 'quizzes')!;
    expect(quizzes.score).toBe(50);
  });

  it('drop-lowest quiz brings the same student back up to 100', () => {
    const cats = MUS_070_CATEGORIES.map((c) =>
      c.key === 'quizzes' ? { ...c, dropLowest: 1 } : c,
    );
    // Same submissions as above; with drop-1, the 0 gets dropped.
    // Quizzes category = 100%. Final = 100.
    const subs: GradeSubmission[] = [
      { categoryKey: 'assignments',        earned: 100, possible: 100 },
      { categoryKey: 'quizzes',            earned: 10,  possible: 10 },
      { categoryKey: 'quizzes',            earned: 0,   possible: 10 },
      { categoryKey: 'tests',              earned: 100, possible: 100 },
      { categoryKey: 'discussions',        earned: 100, possible: 100 },
      { categoryKey: 'midterm',            earned: 100, possible: 100 },
      { categoryKey: 'final_exam',         earned: 100, possible: 100 },
      { categoryKey: 'group_assignment',   earned: 100, possible: 100 },
      { categoryKey: 'special_assignment', earned: 100, possible: 100 },
    ];
    const result = computeCourseGrade(subs, cats);
    expect(result.finalScore).toBeCloseTo(100, 5);
    const quizzes = result.categories.find((c) => c.key === 'quizzes')!;
    expect(quizzes.droppedSubmissions).toBe(1);
    expect(quizzes.countedSubmissions).toBe(1);
  });

  it('borderline B/B- boundary: 83 exactly returns B, 82.999 returns B-', () => {
    // Semantic sanity — the letter-grade thresholds shouldn't drift.
    expect(letterGrade(83)).toBe('B');
    expect(letterGrade(82.999)).toBe('B-');
    expect(letterGrade(80)).toBe('B-');
    expect(letterGrade(79.999)).toBe('C+');
  });

  it('a fresh course with no work has final = null and formats as em dash', () => {
    const result = computeCourseGrade([], MUS_070_CATEGORIES);
    expect(result.finalScore).toBeNull();
    expect(formatGradePct(result.finalScore)).toBe('—');
    expect(letterGrade(result.finalScore)).toBe('—');
  });
});
