import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BarChart3, BookOpen, TrendingDown, CheckCircle2, GraduationCap, Target, Minus, Table2, Users, ShieldCheck, ShieldAlert, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { StudentPollInterface } from '@/components/course/StudentPollInterface';
import { useCourseGrade } from '@/hooks/useCourseGrade';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { StudentGradeSpreadsheet } from './StudentGradeSpreadsheet';
import { Mus240GradeGrid } from '@/components/mus240/grades/Mus240GradeGrid';

interface EmbeddedStudentGradeViewProps {
  courseId: string;
}

export const EmbeddedStudentGradeView: React.FC<EmbeddedStudentGradeViewProps> = ({ courseId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('spreadsheet');

  const { 
    percentage, 
    letterGrade, 
    deductions, 
    stats, 
    loading: gradeLoading,
    isAttendanceOnly,
  } = useCourseGrade(courseId);

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['gw-student-assignments', courseId, user?.id],
    queryFn: async () => {
      const { data: courseDataRaw, error: courseError } = await supabase
        .from('gw_courses' as any)
        .select('start_date, end_date, semester, term')
        .eq('id', courseId)
        .maybeSingle();

      if (courseError) throw courseError;

      const courseData = courseDataRaw as unknown as { start_date: string | null; end_date: string | null; semester: string | null; term: string | null } | null;

      const getCourseWindow = () => {
        const startFromDb = courseData?.start_date ? new Date(courseData.start_date) : null;
        const endFromDb = courseData?.end_date ? new Date(courseData.end_date) : null;
        if (startFromDb) return { start: startFromDb, end: endFromDb };

        const semesterRaw = String(courseData?.semester ?? courseData?.term ?? '').toUpperCase();
        const yearMatch = semesterRaw.match(/(20\d{2})/);
        const year = yearMatch ? Number(yearMatch[1]) : null;

        const month = semesterRaw.includes('SPRING')
          ? 0
          : semesterRaw.includes('SUMMER')
            ? 5
            : semesterRaw.includes('FALL')
              ? 7
              : null;

        if (month === null && /^20\d{4,6}$/.test(String(courseData?.term ?? ''))) {
          const termStr = String(courseData?.term);
          const y = Number(termStr.slice(0, 4));
          const m = Number(termStr.slice(4, 6) || '01') - 1;
          return { start: new Date(y, Math.max(0, Math.min(11, m)), 1), end: null as Date | null };
        }

        if (year !== null && month !== null) {
          return { start: new Date(year, month, 1), end: null as Date | null };
        }

        return { start: null as Date | null, end: null as Date | null };
      };

      const { start, end } = getCourseWindow();

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('gw_course_assignments')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      if (assignmentsError) throw assignmentsError;

      const filteredAssignments = (assignmentsData as any[] | null | undefined)?.filter((a: any) => {
        if (!start) return true;
        if (!a?.due_date) return true;
        const due = new Date(a.due_date);
        if (Number.isNaN(due.getTime())) return true;
        if (due < start) return false;
        if (end && due > end) return false;
        return true;
      });

      const { data: submissionsData, error: submissionsError } = await supabase
        .from('gw_assignment_submissions' as any)
        .select('assignment_id, status')
        .eq('user_id', user?.id);

      if (submissionsError) throw submissionsError;

      const submissionsMap = new Map(submissionsData?.map((s: any) => [s.assignment_id, s.status]));

      return (filteredAssignments as any[])?.map((assignment: any) => ({
        ...assignment,
        submissionStatus: submissionsMap.get(assignment.id) || 'not_submitted',
      }));
    },
    enabled: !!user,
  });

  const { data: grades } = useQuery({
    queryKey: ['student-course-grades', courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_grades' as any)
        .select('*, gw_course_assignments(points)')
        .eq('student_id', user?.id)
        .eq('released_to_student', true);
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  if (assignmentsLoading || gradeLoading) {
    return <LoadingSpinner size="lg" text="Loading grades..." />;
  }

  const getGradeColor = (pct: number) => {
    if (pct >= 90) return 'text-green-600 dark:text-green-400';
    if (pct >= 80) return 'text-blue-600 dark:text-blue-400';
    if (pct >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (pct >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeBg = (pct: number) => {
    if (pct >= 90) return 'bg-green-500/10 border-green-500/20';
    if (pct >= 80) return 'bg-blue-500/10 border-blue-500/20';
    if (pct >= 70) return 'bg-yellow-500/10 border-yellow-500/20';
    if (pct >= 60) return 'bg-orange-500/10 border-orange-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="space-y-6">
      {isAttendanceOnly ? (
        /* ═══ MUS 070 Attendance-Only Grade Card ═══ */
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #003366 0%, #004d99 60%, #7cb9e8 100%)' }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-6 w-6 text-white/80" />
                <h2 className="text-white text-lg font-bold">Grade Calculation</h2>
              </div>
              <p className="text-white/70 text-sm">Based on attendance only</p>
            </div>
          </div>

          <div className="rounded-xl border-2 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4 flex items-center justify-between">
            <span className="font-semibold text-green-800 dark:text-green-300 text-lg">Starting Grade</span>
            <span className="text-3xl font-black text-green-700 dark:text-green-400">100%</span>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Allowed Absences</span>
              </div>
              <span className="text-lg font-bold text-primary">{stats.allowedAbsences ?? 2}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                <span className="font-semibold text-foreground">Your Unexcused Absences</span>
              </div>
              <span className={cn("text-lg font-bold", (stats.excessAbsences ?? 0) > 0 ? "text-destructive" : "text-green-600")}>
                {stats.absenceCount}
              </span>
            </div>
            {(stats.excessAbsences ?? 0) > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{stats.excessAbsences} absence{(stats.excessAbsences ?? 0) !== 1 ? 's' : ''} beyond the allowed {stats.allowedAbsences} — grade dropped</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border-2 border-primary/30 p-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #003366 0%, #004d99 100%)' }}>
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-white" />
              <span className="text-white font-semibold text-lg">Current Grade</span>
            </div>
            <span className="text-4xl font-black text-white">{letterGrade}</span>
          </div>

          <Card className="border-dashed">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                <strong>Glee Club Handbook Policy:</strong> 2 unexcused absences allowed. 3rd absence drops A → B. Each additional drops one letter grade.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className={cn("border-2", getGradeBg(percentage))}>
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative flex-shrink-0">
                <div className={cn("h-32 w-32 rounded-full flex items-center justify-center border-4", getGradeBg(percentage))}>
                  <div className="text-center">
                    <div className={cn("text-4xl font-bold", getGradeColor(percentage))}>{letterGrade}</div>
                    <div className={cn("text-lg font-semibold", getGradeColor(percentage))}>{percentage}%</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Current Course Grade
                  </h3>
                  <p className="text-sm text-muted-foreground">Based on the deductive grading model (starts at 100%)</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Grade Progress</span>
                    <span className="font-medium">{percentage}%</span>
                  </div>
                  <Progress value={percentage} className="h-3" />
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="text-lg font-bold">{stats.assignmentCount}</div>
                    <div className="text-xs text-muted-foreground">Assignments</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="text-lg font-bold">{stats.gradedCount}</div>
                    <div className="text-xs text-muted-foreground">Graded</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="text-lg font-bold">{stats.absenceCount}</div>
                    <div className="text-xs text-muted-foreground">Absences</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-slate-200 dark:bg-slate-800">
          <TabsTrigger value="spreadsheet" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">
            <Table2 className="h-4 w-4" />
            <span className="hidden sm:inline">Grades</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Summary</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Work</span>
          </TabsTrigger>
          <TabsTrigger value="polls" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Polls</span>
          </TabsTrigger>
        </TabsList>

        {/* Spreadsheet Tab - Use new Mus240GradeGrid for MUS-240 */}
        <TabsContent value="spreadsheet" className="mt-6">
          {courseId === '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' ? (
            <Mus240GradeGrid />
          ) : (
            <StudentGradeSpreadsheet courseId={courseId} />
          )}
        </TabsContent>

        {/* Overview/Breakdown Tab */}
        <TabsContent value="overview" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="h-5 w-5 text-destructive" />
                Grade Deductions
              </CardTitle>
              <CardDescription>
                Your grade starts at 100% and deductions are applied based on performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Starting Point */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Starting Grade</span>
                </div>
                <span className="text-lg font-bold text-green-600">100%</span>
              </div>

              {/* Assignment Deductions */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Minus className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Assignment Deductions</span>
                    <p className="text-xs text-muted-foreground">
                      Based on {stats.gradedCount} graded assignment{stats.gradedCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-lg font-bold",
                  deductions.assignments > 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {deductions.assignments > 0 ? `-${deductions.assignments}%` : '0%'}
                </span>
              </div>

              {/* Attendance Deductions */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Minus className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Attendance Deductions</span>
                    <p className="text-xs text-muted-foreground">
                      {stats.absenceCount} unexcused absence{stats.absenceCount !== 1 ? 's' : ''} × 2%
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-lg font-bold",
                  deductions.attendance > 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {deductions.attendance > 0 ? `-${deductions.attendance}%` : '0%'}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Current Grade</span>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-2xl font-bold", getGradeColor(percentage))}>
                      {percentage}%
                    </span>
                    <span className={cn("ml-2 text-lg font-semibold", getGradeColor(percentage))}>
                      ({letterGrade})
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grade Scale Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grade Scale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {[
                  { grade: 'A', range: '95-100', color: 'text-green-600' },
                  { grade: 'B', range: '80-94', color: 'text-blue-600' },
                  { grade: 'C', range: '70-79', color: 'text-yellow-600' },
                  { grade: 'D', range: '60-69', color: 'text-orange-600' },
                  { grade: 'F', range: '0-59', color: 'text-red-600' }
                ].map((item) => (
                  <div 
                    key={item.grade} 
                    className={cn(
                      "p-3 rounded-lg bg-muted/50",
                      letterGrade.startsWith(item.grade) && "ring-2 ring-primary bg-primary/10"
                    )}
                  >
                    <div className={cn("text-xl font-bold", item.color)}>{item.grade}</div>
                    <div className="text-xs text-muted-foreground">{item.range}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="mt-6">
          <div className="grid gap-4">
            {assignments?.map((assignment) => {
              const assignmentGrade = grades?.find(g => g.assignment_id === assignment.id);
              
              return (
                <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {assignment.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          assignment.submissionStatus === 'graded' ? 'default' : 
                          assignment.submissionStatus === 'submitted' ? 'secondary' : 
                          'outline'
                        }>
                          {assignment.submissionStatus}
                        </Badge>
                        <span className="text-sm font-normal text-muted-foreground">
                          {assignment.points} pts
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                      </span>
                      {assignmentGrade && (
                        <span className="font-medium">
                          Score: {assignmentGrade.grade}/{assignmentGrade.gw_course_assignments?.points || assignment.points}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(!assignments || assignments.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No assignments found for this course.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Polls Tab */}
        <TabsContent value="polls" className="mt-6">
          <StudentPollInterface courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
