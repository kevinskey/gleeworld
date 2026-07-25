// Weighted-category final-grade computation.
//
// Pure function — no DB, no React. The gradebook and the console both
// call this against the same shape so student-visible and instructor-
// visible grades never diverge.
//
// Behaviour:
//   - category_score = sum(earned) / sum(possible) × 100 across all
//     non-excused graded submissions in that category.
//   - final = sum(category_score × weight_pct / 100) for categories
//     with at least one graded submission, then normalised over the
//     sum of active weights so a partial semester is on a 0-100 scale.
//   - Categories with `drop_lowest > 0` drop the lowest N submissions
//     by fraction earned/possible.
//   - Excused submissions are excluded from both numerator and
//     denominator (they don't count for or against the student).
//   - Ungraded submissions (grade === null AND not excused) do not
//     count toward the category's percentage — they simply aren't
//     graded yet. Instructors who want a zero should enter one.

export interface GradeSubmission {
  /** Assignment category key — matches gw_course_grade_categories.key. */
  categoryKey: string;
  /** Points the student earned. `null` = not graded yet, exclude from calc. */
  earned: number | null;
  /** Max points on this assignment. */
  possible: number;
  /** Excused — not counted for or against. Overrides `earned`. */
  excused?: boolean;
}

export interface GradeCategory {
  key: string;
  label: string;
  weightPct: number;
  dropLowest: number;
}

export interface CategorySummary {
  key: string;
  label: string;
  weightPct: number;
  /** Submissions that counted toward the category (post-drop, post-excuse). */
  countedSubmissions: number;
  /** Whole submissions dropped by drop-lowest rule. */
  droppedSubmissions: number;
  /** 0-100 category percentage, or null when no graded work to compute against. */
  score: number | null;
  totalEarned: number;
  totalPossible: number;
}

export interface CourseGradeResult {
  /** Per-category breakdown, in the order categories were supplied. */
  categories: CategorySummary[];
  /**
   * Final course grade 0-100, or null if no category has any graded
   * work yet. Weights of empty categories are excluded from the
   * denominator so partial-semester grades don't understate.
   */
  finalScore: number | null;
  /**
   * Sum of weights for categories that actually contributed. Useful
   * for a "grade to date" disclaimer in the UI: "Based on X% of
   * planned course weight".
   */
  activeWeightPct: number;
}

/**
 * Compute a student's course grade given the category definitions and
 * their submissions. See file header for behaviour notes.
 */
export function computeCourseGrade(
  submissions: GradeSubmission[],
  categories: GradeCategory[],
): CourseGradeResult {
  const byCategory = new Map<string, GradeSubmission[]>();
  for (const cat of categories) byCategory.set(cat.key, []);
  for (const sub of submissions) {
    const bucket = byCategory.get(sub.categoryKey);
    if (bucket) bucket.push(sub); // silently ignore submissions whose category is not configured
  }

  const summaries: CategorySummary[] = categories.map((cat) => {
    const all = byCategory.get(cat.key) ?? [];
    // Excused submissions never count.
    const eligible = all.filter((s) => !s.excused);
    // Only graded submissions can be scored / dropped.
    const graded = eligible.filter((s) => s.earned !== null && s.possible > 0);

    let counted = graded;
    let dropped = 0;
    if (cat.dropLowest > 0 && graded.length > 0) {
      // Sort by fraction earned/possible ascending, drop up to `dropLowest`
      // — but never drop everything (leave at least one graded submission
      // so an "A student who only did one quiz" still has a category score).
      const ranked = [...graded].sort(
        (a, b) => (a.earned as number) / a.possible - (b.earned as number) / b.possible,
      );
      const dropN = Math.min(cat.dropLowest, Math.max(0, graded.length - 1));
      counted = ranked.slice(dropN);
      dropped = dropN;
    }

    const totalEarned = counted.reduce((s, x) => s + (x.earned as number), 0);
    const totalPossible = counted.reduce((s, x) => s + x.possible, 0);
    const score = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : null;

    return {
      key: cat.key,
      label: cat.label,
      weightPct: cat.weightPct,
      countedSubmissions: counted.length,
      droppedSubmissions: dropped,
      score,
      totalEarned,
      totalPossible,
    };
  });

  // Final: weighted average across categories that actually scored.
  const active = summaries.filter((s) => s.score !== null && s.weightPct > 0);
  const activeWeight = active.reduce((sum, s) => sum + s.weightPct, 0);
  const finalScore =
    active.length === 0 || activeWeight === 0
      ? null
      : active.reduce((sum, s) => sum + (s.score as number) * (s.weightPct / activeWeight), 0);

  return {
    categories: summaries,
    finalScore,
    activeWeightPct: activeWeight,
  };
}

/** Convenience — rounds to one decimal or returns null. */
export function formatGradePct(v: number | null): string {
  if (v === null || Number.isNaN(v)) return '—';
  return `${Math.round(v * 10) / 10}%`;
}

/** Letter mapping — default GleeWorld scale. Adjust if the tenant asks. */
export function letterGrade(v: number | null): string {
  if (v === null || Number.isNaN(v)) return '—';
  if (v >= 93) return 'A';
  if (v >= 90) return 'A-';
  if (v >= 87) return 'B+';
  if (v >= 83) return 'B';
  if (v >= 80) return 'B-';
  if (v >= 77) return 'C+';
  if (v >= 73) return 'C';
  if (v >= 70) return 'C-';
  if (v >= 67) return 'D+';
  if (v >= 63) return 'D';
  if (v >= 60) return 'D-';
  return 'F';
}
