import { describe, it, expect } from 'vitest';
import {
  computeCourseGrade,
  formatGradePct,
  letterGrade,
  type GradeCategory,
  type GradeSubmission,
} from './computeCourseGrade';

const defaultCategories: GradeCategory[] = [
  { key: 'assignments', label: 'Assignments', weightPct: 20, dropLowest: 0 },
  { key: 'quizzes', label: 'Quizzes', weightPct: 10, dropLowest: 0 },
  { key: 'tests', label: 'Tests', weightPct: 15, dropLowest: 0 },
  { key: 'discussions', label: 'Discussions', weightPct: 5, dropLowest: 0 },
  { key: 'midterm', label: 'Midterm', weightPct: 15, dropLowest: 0 },
  { key: 'final_exam', label: 'Final Exam', weightPct: 20, dropLowest: 0 },
  { key: 'group_assignment', label: 'Group Assignment', weightPct: 10, dropLowest: 0 },
  { key: 'special_assignment', label: 'Special Assignment', weightPct: 5, dropLowest: 0 },
];

describe('computeCourseGrade', () => {
  it('returns null final when there are no graded submissions', () => {
    const result = computeCourseGrade([], defaultCategories);
    expect(result.finalScore).toBeNull();
    expect(result.activeWeightPct).toBe(0);
    // Every category is present in the summary array
    expect(result.categories).toHaveLength(8);
    for (const c of result.categories) {
      expect(c.score).toBeNull();
      expect(c.countedSubmissions).toBe(0);
    }
  });

  it('computes a single-category score correctly', () => {
    const subs: GradeSubmission[] = [
      { categoryKey: 'assignments', earned: 80, possible: 100 },
      { categoryKey: 'assignments', earned: 90, possible: 100 },
    ];
    const result = computeCourseGrade(subs, defaultCategories);
    const assignments = result.categories.find((c) => c.key === 'assignments')!;
    expect(assignments.score).toBe(85);
    // Only assignments contributed, weight normalisation → final = category score
    expect(result.finalScore).toBe(85);
    expect(result.activeWeightPct).toBe(20);
  });

  it('normalises weights across only the active categories', () => {
    // Two categories with grades: assignments (20 wt) = 100%, tests (15 wt) = 60%
    // Active weight = 35; final = (100 × 20/35) + (60 × 15/35) = 57.14 + 25.71 = 82.86
    const subs: GradeSubmission[] = [
      { categoryKey: 'assignments', earned: 100, possible: 100 },
      { categoryKey: 'tests', earned: 60, possible: 100 },
    ];
    const result = computeCourseGrade(subs, defaultCategories);
    expect(result.finalScore).toBeCloseTo(82.857, 2);
    expect(result.activeWeightPct).toBe(35);
  });

  it('excludes excused submissions from both numerator and denominator', () => {
    const subs: GradeSubmission[] = [
      { categoryKey: 'quizzes', earned: 10, possible: 10 },
      { categoryKey: 'quizzes', earned: 0, possible: 10, excused: true },
    ];
    const result = computeCourseGrade(subs, defaultCategories);
    const quizzes = result.categories.find((c) => c.key === 'quizzes')!;
    expect(quizzes.score).toBe(100);
    expect(quizzes.countedSubmissions).toBe(1);
  });

  it('excludes ungraded submissions (earned=null) from the category score', () => {
    const subs: GradeSubmission[] = [
      { categoryKey: 'tests', earned: 85, possible: 100 },
      { categoryKey: 'tests', earned: null, possible: 100 }, // not graded yet
    ];
    const result = computeCourseGrade(subs, defaultCategories);
    const tests = result.categories.find((c) => c.key === 'tests')!;
    expect(tests.score).toBe(85);
    expect(tests.countedSubmissions).toBe(1);
  });

  it('applies drop-lowest without dropping the only submission', () => {
    const cats = defaultCategories.map((c) => (c.key === 'quizzes' ? { ...c, dropLowest: 1 } : c));
    // Only one graded quiz — drop-lowest must not drop it (would leave zero).
    const subs: GradeSubmission[] = [
      { categoryKey: 'quizzes', earned: 6, possible: 10 },
    ];
    const result = computeCourseGrade(subs, cats);
    const quizzes = result.categories.find((c) => c.key === 'quizzes')!;
    expect(quizzes.score).toBe(60);
    expect(quizzes.droppedSubmissions).toBe(0);
    expect(quizzes.countedSubmissions).toBe(1);
  });

  it('drops the lowest N quizzes when there are enough submissions', () => {
    const cats = defaultCategories.map((c) => (c.key === 'quizzes' ? { ...c, dropLowest: 2 } : c));
    // Fractions: 0.4, 0.6, 0.8, 1.0. Drop 0.4 and 0.6 → keep 0.8 + 1.0.
    // Counted totals: earned 90, possible 100 → 90%.
    const subs: GradeSubmission[] = [
      { categoryKey: 'quizzes', earned: 4, possible: 10 },
      { categoryKey: 'quizzes', earned: 6, possible: 10 },
      { categoryKey: 'quizzes', earned: 40, possible: 50 },
      { categoryKey: 'quizzes', earned: 40, possible: 40 },
    ];
    const result = computeCourseGrade(subs, cats);
    const quizzes = result.categories.find((c) => c.key === 'quizzes')!;
    expect(quizzes.droppedSubmissions).toBe(2);
    expect(quizzes.countedSubmissions).toBe(2);
    expect(quizzes.score).toBeCloseTo(88.888, 2);
  });

  it('ignores submissions whose category is not configured', () => {
    const subs: GradeSubmission[] = [
      { categoryKey: 'legacy_thing', earned: 100, possible: 100 },
      { categoryKey: 'assignments', earned: 70, possible: 100 },
    ];
    const result = computeCourseGrade(subs, defaultCategories);
    expect(result.finalScore).toBe(70);
    expect(result.activeWeightPct).toBe(20);
  });

  it('treats possible=0 as ungradable (no divide-by-zero)', () => {
    const subs: GradeSubmission[] = [
      { categoryKey: 'assignments', earned: 0, possible: 0 },
    ];
    const result = computeCourseGrade(subs, defaultCategories);
    const a = result.categories.find((c) => c.key === 'assignments')!;
    expect(a.score).toBeNull();
    expect(result.finalScore).toBeNull();
  });

  it('handles a category whose weight is zero (not counted, ever)', () => {
    const cats = defaultCategories.map((c) =>
      c.key === 'discussions' ? { ...c, weightPct: 0 } : c,
    );
    const subs: GradeSubmission[] = [
      { categoryKey: 'discussions', earned: 100, possible: 100 },
      { categoryKey: 'assignments', earned: 50, possible: 100 },
    ];
    const result = computeCourseGrade(subs, cats);
    // Discussions has a score (100) but weight 0 → excluded from final.
    expect(result.finalScore).toBe(50);
    expect(result.activeWeightPct).toBe(20);
  });

  it('produces a full-course final when every category has grades', () => {
    // Every category earns 100% → final must be exactly 100 regardless of weights.
    const subs: GradeSubmission[] = defaultCategories.map((c) => ({
      categoryKey: c.key,
      earned: 10,
      possible: 10,
    }));
    const result = computeCourseGrade(subs, defaultCategories);
    expect(result.finalScore).toBeCloseTo(100, 5);
    expect(result.activeWeightPct).toBe(100);
  });
});

describe('formatGradePct', () => {
  it('rounds to one decimal and adds %', () => {
    expect(formatGradePct(85.4567)).toBe('85.5%');
    expect(formatGradePct(100)).toBe('100%');
  });
  it('renders em dash for null / NaN', () => {
    expect(formatGradePct(null)).toBe('—');
    expect(formatGradePct(Number.NaN)).toBe('—');
  });
});

describe('letterGrade', () => {
  it('maps standard bands', () => {
    expect(letterGrade(95)).toBe('A');
    expect(letterGrade(91)).toBe('A-');
    expect(letterGrade(88)).toBe('B+');
    expect(letterGrade(83)).toBe('B');
    expect(letterGrade(75)).toBe('C');
    expect(letterGrade(59)).toBe('F');
  });
  it('handles null', () => {
    expect(letterGrade(null)).toBe('—');
  });
});
