import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  computeCourseGrade,
  formatGradePct,
  letterGrade,
  type GradeCategory,
  type GradeSubmission,
} from '@/lib/grading/computeCourseGrade';

interface GradebookViewProps {
  courseId: string;
  // Rendered inside another page (e.g. CourseShell's Grades tab):
  // hides the standalone page chrome (container, back button, title).
  embedded?: boolean;
}

export const GradebookView: React.FC<GradebookViewProps> = ({ courseId, embedded = false }) => {
  const navigate = useNavigate();

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['gw-course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_courses' as any)
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['gw-course-assignments', courseId],
    queryFn: async () => {
      // Dual-source, same as CourseGradebook: older courses used
      // gw_course_assignments, the CourseShell flow uses gw_assignments.
      // Submissions for both live in gw_course_submissions.
      const [oldAsn, newAsn] = await Promise.all([
        supabase
          .from('gw_course_assignments')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: true }),
        supabase
          .from('gw_assignments')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
      ]);
      if (oldAsn.error) throw oldAsn.error;
      if (newAsn.error) throw newAsn.error;
      return [...((oldAsn.data as any[]) ?? []), ...((newAsn.data as any[]) ?? [])];
    },
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['gw-course-enrollments', courseId],
    queryFn: async () => {
      // Two-step lookup: gw_course_enrollments has no FK to a profile
      // table, so PostgREST implicit joins return zero rows silently.
      const { data: enr, error } = await supabase
        .from('gw_course_enrollments')
        .select('user_id, enrolled_at')
        .eq('course_id', courseId)
        .in('enrollment_status', ['enrolled', 'active', 'in_progress', 'registered'])
        .order('enrolled_at', { ascending: true });
      if (error) throw error;
      const rows = ((enr as any[]) ?? [])
        .filter((e) => !!e.user_id)
        .map((e) => ({
          student_id: e.user_id as string,
          enrolled_at: e.enrolled_at,
        }));
      const userIds = Array.from(new Set(rows.map((r) => r.student_id).filter(Boolean)));
      const { data: profiles } = userIds.length > 0
        ? await supabase
            .from('gw_profiles_directory' as any)
            .select('user_id, full_name, email')
            .in('user_id', userIds)
        : { data: [] as any[] };
      const pMap = new Map<string, { full_name: string | null; email: string | null }>();
      for (const p of ((profiles as any[]) ?? [])) {
        pMap.set(p.user_id, { full_name: p.full_name ?? null, email: p.email ?? null });
      }
      return rows.map((r) => ({
        ...r,
        gw_profiles: pMap.get(r.student_id) ?? { full_name: null, email: null },
      }));
    },
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['gw-course-submissions', courseId],
    queryFn: async () => {
      if (!assignments || assignments.length === 0) return [];

      const assignmentIds = assignments.map(a => a.id);

      // Fetch all submissions for these assignments (general-purpose
      // table paired with gw_assignments; gw_assignment_submissions is
      // sight-reading-only and would return empty here).
      const { data: submissions } = await supabase
        .from('gw_course_submissions')
        .select('*')
        .in('assignment_id', assignmentIds);

      return submissions;
    },
    enabled: !!assignments && assignments.length > 0,
  });

  const { data: gradeRecords, isLoading: gradesLoading } = useQuery({
    queryKey: ['gw-course-grades', courseId],
    queryFn: async () => {
      if (!assignments || assignments.length === 0) return [];

      const assignmentIds = assignments.map(a => a.id);
      const { data, error } = await supabase
        .from('gw_grades' as any)
        .select('*')
        .in('assignment_id', assignmentIds);

      if (error) throw error;
      return data;
    },
    enabled: !!assignments && assignments.length > 0,
  });

  // Grade categories with per-course weights. Drives both the per-
  // category subtotal columns and the weighted final.
  const { data: gradeCategories } = useQuery<GradeCategory[]>({
    queryKey: ['gw-course-grade-categories', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_course_grade_categories' as any)
        .select('key, label, weight_pct, drop_lowest, sort_order')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      const rows = (data as unknown as Array<{ key: string; label: string; weight_pct: number; drop_lowest: number }>) ?? [];
      return rows.map((r) => ({
        key: r.key,
        label: r.label,
        weightPct: Number(r.weight_pct) || 0,
        dropLowest: Number(r.drop_lowest) || 0,
      }));
    },
  });

  // Assignment id → category key. `assignment_type` values that don't
  // match a configured category default to 'assignments' so legacy
  // rows (created before this system existed) still contribute rather
  // than silently disappearing from the final calc.
  const categoryByAssignment = useMemo(() => {
    const map = new Map<string, string>();
    const validKeys = new Set((gradeCategories ?? []).map((c) => c.key));
    for (const a of assignments ?? []) {
      const raw = (a.assignment_type as string | null) ?? '';
      map.set(a.id, validKeys.has(raw) ? raw : 'assignments');
    }
    return map;
  }, [assignments, gradeCategories]);

  // Calculate gradebook data
  const gradebookData = useMemo(() => {
    if (!enrollments || !assignments || !submissions || !gradeRecords) return [];
    const categories = gradeCategories ?? [];

    return enrollments.map(enrollment => {
      const studentId = enrollment.student_id;
      const studentName = enrollment.gw_profiles?.full_name || enrollment.gw_profiles?.email || 'Unknown';

      const assignmentGrades = assignments.map(assignment => {
        // gw_course_submissions uses student_id (not user_id) and stores
        // the grade in points_earned (fallback to grade); gw_grades keeps
        // its own total_score for pre-formula legacy rows.
        const submission = (submissions as any[] || []).find(
          (s: any) => s.student_id === studentId && s.assignment_id === assignment.id
        );
        const gradeRec = (gradeRecords as any[] || []).find(
          (g: any) => g.student_id === studentId && g.assignment_id === assignment.id
        );
        const gradeValue = gradeRec?.total_score ?? submission?.points_earned ?? submission?.grade ?? null;
        const status = gradeRec ? 'graded' : (submission ? (submission.status || 'submitted') : 'not_submitted');
        return {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          assignmentPoints: assignment.points || 100,
          grade: gradeValue,
          status,
          submittedAt: submission?.submitted_at,
          excused: gradeRec?.excused === true,
          categoryKey: categoryByAssignment.get(assignment.id) ?? 'assignments',
        };
      });

      const submissionsForFormula: GradeSubmission[] = assignmentGrades.map((g) => ({
        categoryKey: g.categoryKey,
        earned: g.grade,
        possible: g.assignmentPoints,
        excused: g.excused,
      }));
      const weighted = computeCourseGrade(submissionsForFormula, categories);

      return {
        studentId,
        studentName,
        studentEmail: enrollment.gw_profiles?.email,
        grades: assignmentGrades,
        weighted,
      };
    });
  }, [enrollments, assignments, submissions, gradeRecords, gradeCategories, categoryByAssignment]);

  const getGradeColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportToCSV = () => {
    if (!gradebookData || gradebookData.length === 0) return;
    const categories = gradeCategories ?? [];

    const headers = [
      'Student',
      'Email',
      ...assignments.map(a => a.title),
      ...categories.map(c => `${c.label} (${c.weightPct}%)`),
      'Final %',
      'Final Letter',
    ];
    const rows = gradebookData.map(student => {
      const catScores = categories.map((c) => {
        const summary = student.weighted.categories.find((cs) => cs.key === c.key);
        return summary?.score !== null && summary?.score !== undefined
          ? summary.score.toFixed(2) + '%'
          : '-';
      });
      return [
        student.studentName,
        student.studentEmail,
        ...student.grades.map(g => g.grade !== null ? g.grade : '-'),
        ...catScores,
        student.weighted.finalScore !== null ? student.weighted.finalScore.toFixed(2) + '%' : '-',
        letterGrade(student.weighted.finalScore),
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course?.code}_gradebook.csv`;
    a.click();
  };

  if (courseLoading || assignmentsLoading || enrollmentsLoading || submissionsLoading || gradesLoading) {
    return <LoadingSpinner size="lg" text="Loading gradebook..." />;
  }

  if (!course) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Course not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-6' : 'container mx-auto py-8 space-y-6'}>
      {embedded ? (
        <div className="flex justify-end">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/grading/instructor/course/${courseId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8" />
                Gradebook
              </h1>
              <p className="text-muted-foreground">{course?.code} - {course?.title}</p>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {enrollments?.length || 0} Students · {assignments?.length || 0} Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Student</TableHead>
                  {assignments?.map(assignment => (
                    <TableHead key={assignment.id} className="text-center min-w-[120px]">
                      <div className="space-y-1">
                        <div className="font-semibold">{assignment.title}</div>
                        <div className="text-xs text-muted-foreground">{assignment.points} pts</div>
                      </div>
                    </TableHead>
                  ))}
                  {/* Per-category subtotal columns — one for each weighted category. */}
                  {(gradeCategories ?? []).map((c) => (
                    <TableHead key={`cat-${c.key}`} className="text-center min-w-[110px] border-l bg-muted/30">
                      <div className="space-y-1">
                        <div className="font-semibold text-xs">{c.label}</div>
                        <div className="text-[10px] text-muted-foreground">{c.weightPct}% weight</div>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[110px] border-l bg-primary/10">
                    <div className="space-y-1">
                      <div className="font-semibold">Final %</div>
                      <div className="text-[10px] text-muted-foreground">weighted</div>
                    </div>
                  </TableHead>
                  <TableHead className="text-center min-w-[80px] bg-primary/10">Letter</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradebookData.map(student => (
                  <TableRow key={student.studentId}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      <div>
                        <div>{student.studentName}</div>
                        <div className="text-xs text-muted-foreground">{student.studentEmail}</div>
                      </div>
                    </TableCell>
                    {student.grades.map((grade, idx) => (
                      <TableCell key={idx} className="text-center">
                        {grade.grade !== null ? (
                          <Badge variant="outline" className={getGradeColor(grade.status)}>
                            {grade.grade}/{grade.assignmentPoints}
                          </Badge>
                        ) : grade.status === 'submitted' ? (
                          <Badge variant="outline" className={getGradeColor(grade.status)}>
                            Submitted
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    ))}
                    {/* Per-category subtotals — null score renders as em dash. */}
                    {(gradeCategories ?? []).map((c) => {
                      const summary = student.weighted.categories.find((s) => s.key === c.key);
                      return (
                        <TableCell key={`cat-${c.key}`} className="text-center border-l bg-muted/20">
                          <div className="font-semibold">{formatGradePct(summary?.score ?? null)}</div>
                          {summary && summary.droppedSubmissions > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              drop {summary.droppedSubmissions}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-semibold border-l bg-primary/5">
                      <Badge
                        variant={
                          student.weighted.finalScore === null
                            ? 'outline'
                            : student.weighted.finalScore >= 90
                            ? 'default'
                            : student.weighted.finalScore >= 70
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {formatGradePct(student.weighted.finalScore)}
                      </Badge>
                      {student.weighted.finalScore !== null && student.weighted.activeWeightPct < 100 && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          of {student.weighted.activeWeightPct}% graded
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-bold bg-primary/5">
                      {letterGrade(student.weighted.finalScore)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!gradebookData || gradebookData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No students enrolled yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
