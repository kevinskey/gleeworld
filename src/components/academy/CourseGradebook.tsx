import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Lock, TrendingUp, BookOpen, CheckCircle, Scale } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  computeCourseGrade,
  formatGradePct,
  letterGrade,
  type CategorySummary,
  type GradeCategory,
  type GradeSubmission,
} from '@/lib/grading/computeCourseGrade';

interface CourseGradebookProps {
  courseId: string;
  isEnrolled: boolean;
}

// Fallback used only if the course has zero configured categories
// (predates the seed backfill). All work rolls into "Assignments" at
// 100% weight so the student still sees a useful summary.
const FALLBACK_CATEGORIES: GradeCategory[] = [
  { key: 'assignments', label: 'Assignments', weightPct: 100, dropLowest: 0 },
];

interface GradeData {
  categories: CategorySummary[];
  finalScore: number | null;
  activeWeightPct: number;
  totalPoints: number;   // raw sum of possible on graded/counted work
  earnedPoints: number;  // raw sum of earned on graded/counted work
  gradedCount: number;
  assignmentCount: number;
  assignments: {
    title: string;
    points: number;
    earned: number | null;
    status: string;
    categoryKey: string;
  }[];
}

export const CourseGradebook: React.FC<CourseGradebookProps> = ({ courseId, isEnrolled }) => {
  const { user } = useAuth();
  const [gradeData, setGradeData] = useState<GradeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isEnrolled && user) {
      void fetchGrades();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isEnrolled, user]);

  const fetchGrades = async () => {
    try {
      // 1. Weighted categories for this course.
      const { data: catRows } = await supabase
        .from('gw_course_grade_categories' as any)
        .select('key, label, weight_pct, drop_lowest')
        .eq('course_id', courseId);
      const categoryRows =
        (catRows as unknown as Array<{ key: string; label: string; weight_pct: number; drop_lowest: number }> | null) ?? [];
      const categories: GradeCategory[] =
        categoryRows.length > 0
          ? categoryRows.map((r) => ({
              key: r.key,
              label: r.label,
              weightPct: Number(r.weight_pct) || 0,
              dropLowest: Number(r.drop_lowest) || 0,
            }))
          : FALLBACK_CATEGORIES;
      const validKeys = new Set(categories.map((c) => c.key));

      // 2. Assignments — dual-source. Two live paths in the codebase:
      //   a) gw_course_assignments + gw_course_submissions (older ACADEMY_COURSES flow)
      //   b) gw_assignments + gw_assignment_submissions (newer CourseShell flow,
      //      syncs to calendar via trigger)
      // We union both so the widget shows a coherent gradebook regardless
      // of which flow the course was built with. Both tables are keyed by
      // (course_id, assignment_id, user_id) so there's no conflict.
      const [oldAsn, newAsn] = await Promise.all([
        supabase
          .from('gw_course_assignments')
          .select('id, title, points, assignment_type')
          .eq('course_id', courseId)
          .eq('is_published', true),
        supabase
          .from('gw_assignments')
          .select('id, title, points, assignment_type')
          .eq('course_id', courseId)
          .eq('is_active', true),
      ]);
      type AsnRow = { id: string; title: string; points: number | null; assignment_type: string | null };
      const assignments: AsnRow[] = [
        ...((oldAsn.data as AsnRow[] | null) ?? []),
        ...((newAsn.data as AsnRow[] | null) ?? []),
      ];

      if (assignments.length === 0) {
        setGradeData(null);
        setLoading(false);
        return;
      }

      // Track which table each assignment came from so we query the
      // right submission table for it. Overlap is fine — same key wins.
      const oldIds = new Set(((oldAsn.data as AsnRow[] | null) ?? []).map((a) => a.id));
      const newIds = new Set(((newAsn.data as AsnRow[] | null) ?? []).map((a) => a.id));

      // 3. Submissions. Since migration 20260725250000 repointed
      // gw_course_submissions.assignment_id at gw_assignments, both
      // assignment sources land in a single submissions table now.
      const allIds = [...oldIds, ...newIds];
      const { data: subsData } = allIds.length > 0
        ? await supabase
            .from('gw_course_submissions')
            .select('assignment_id, points_earned, grade, status')
            .eq('student_id', user?.id)
            .in('assignment_id', allIds)
        : { data: [] as any[] };

      type SubmissionRow = { assignment_id: string; grade: number | null; status: string | null };
      const submissionMap = new Map<string, SubmissionRow>();
      for (const s of ((subsData as any[]) ?? [])) {
        // Prefer points_earned; some legacy rows only populated `grade`.
        const grade = s.points_earned != null ? Number(s.points_earned)
          : s.grade != null ? Number(s.grade)
          : null;
        submissionMap.set(s.assignment_id, { assignment_id: s.assignment_id, grade, status: s.status });
      }

      // 4. Build per-assignment view + parallel formula input.
      const gradeItems = assignments.map((assignment) => {
        const submission = submissionMap.get(assignment.id);
        const earned = submission?.grade ?? null;
        const rawType = (assignment.assignment_type as string | null) ?? '';
        const categoryKey = validKeys.has(rawType) ? rawType : 'assignments';
        return {
          title: assignment.title,
          points: assignment.points || 0,
          earned,
          status: submission?.status || 'not_started',
          categoryKey,
        };
      });

      const formulaSubs: GradeSubmission[] = gradeItems.map((g) => ({
        categoryKey: g.categoryKey,
        earned: g.earned,
        possible: g.points,
      }));

      const weighted = computeCourseGrade(formulaSubs, categories);

      // Raw totals — kept for the "Points Earned" tile which is
      // informational (unweighted), not the grade of record.
      let totalPoints = 0;
      let earnedPoints = 0;
      let gradedCount = 0;
      for (const g of gradeItems) {
        totalPoints += g.points;
        if (g.earned !== null) {
          earnedPoints += g.earned;
          gradedCount += 1;
        }
      }

      setGradeData({
        categories: weighted.categories,
        finalScore: weighted.finalScore,
        activeWeightPct: weighted.activeWeightPct,
        totalPoints,
        earnedPoints,
        gradedCount,
        assignmentCount: gradeItems.length,
        assignments: gradeItems,
      });
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string): string => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    if (grade.startsWith('D')) return 'text-orange-600';
    if (grade === '—') return 'text-muted-foreground';
    return 'text-red-600';
  };

  if (!isEnrolled) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Gradebook</h3>
          <p className="text-muted-foreground">
            Enroll in this course to view your grades.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentLetter = gradeData ? letterGrade(gradeData.finalScore) : '—';

  return (
    <div className="space-y-6">
      {/* Grade Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Current Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : gradeData && gradeData.finalScore !== null ? (
              <div>
                <div className={`text-4xl font-bold ${getGradeColor(currentLetter)}`}>
                  {currentLetter}
                </div>
                <p className="text-lg text-muted-foreground">
                  {formatGradePct(gradeData.finalScore)}
                </p>
                {gradeData.activeWeightPct < 100 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {gradeData.activeWeightPct}% of course weight graded
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No grades yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Points Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : gradeData && gradeData.gradedCount > 0 ? (
              <div>
                <div className="text-4xl font-bold">{gradeData.earnedPoints}</div>
                <p className="text-sm text-muted-foreground">
                  of {gradeData.totalPoints} possible
                </p>
                <Progress
                  value={gradeData.totalPoints > 0 ? (gradeData.earnedPoints / gradeData.totalPoints) * 100 : 0}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Raw total — not weighted
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No assignments graded</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : gradeData ? (
              <div>
                <div className="text-4xl font-bold">{gradeData.gradedCount}</div>
                <p className="text-sm text-muted-foreground">
                  of {gradeData.assignmentCount} graded
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No assignments</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weighted category breakdown — reveals how each category
          contributes to the final. Only shown once at least one
          category has a score, otherwise it would be a wall of dashes. */}
      {!loading && gradeData && gradeData.categories.some((c) => c.score !== null) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-4 w-4 text-primary" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gradeData.categories.map((c) => {
                const graded = c.score !== null;
                return (
                  <div
                    key={c.key}
                    className={`rounded-lg border p-3 ${graded ? 'bg-muted/30' : 'bg-muted/10 opacity-60'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium truncate">{c.label}</div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {c.weightPct}%
                      </Badge>
                    </div>
                    <div className={`text-xl font-bold ${graded ? '' : 'text-muted-foreground'}`}>
                      {formatGradePct(c.score)}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {graded ? (
                        <>
                          {c.totalEarned}/{c.totalPossible} pts
                          {c.droppedSubmissions > 0 && ` · drop ${c.droppedSubmissions}`}
                        </>
                      ) : (
                        'No graded work'
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grade Details */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Loading grades...</p>
          ) : !gradeData || gradeData.assignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No graded assignments yet.
            </p>
          ) : (
            <div className="space-y-3">
              {gradeData.assignments.map((assignment, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {assignment.earned !== null ? (
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground shrink-0" />
                    )}
                    <span className="font-medium truncate">{assignment.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {gradeData.categories.find((c) => c.key === assignment.categoryKey)?.label ?? assignment.categoryKey}
                    </Badge>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {assignment.earned !== null ? (
                      <span className="font-semibold">
                        {assignment.earned}/{assignment.points}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—/{assignment.points}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
