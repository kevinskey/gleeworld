import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';
import {
  FileText, ArrowLeft, BarChart3, BookOpen, Calendar,
  CheckCircle2, AlertCircle, GraduationCap, Users,
  ShieldCheck, ShieldAlert, Minus, Check, X, Clock, ChevronDown
} from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { StudentPollInterface } from '@/components/course/StudentPollInterface';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { useCourseGrade } from '@/hooks/useCourseGrade';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getCourseGradingConfig } from '@/config/courseGradingConfig';
import { format } from 'date-fns';
import { RehearsalConflictForm } from './RehearsalConflictForm';
import { AdminConflictApproval } from './AdminConflictApproval';

interface StudentCourseViewProps {
  courseId: string;
}

export const StudentCourseView: React.FC<StudentCourseViewProps> = ({ courseId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('grades');

  const {
    percentage,
    letterGrade,
    deductions,
    stats,
    loading: gradeLoading,
    isAttendanceOnly,
  } = useCourseGrade(courseId);

  const gradingConfig = getCourseGradingConfig(courseId);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['gw-course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_courses' as any)
        .select('*')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['gw-student-assignments', courseId, user?.id],
    queryFn: async () => {
      const { data: assignmentsData, error } = await supabase
        .from('gw_course_assignments')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const { data: submissionsData } = await supabase
        .from('gw_assignment_submissions' as any)
        .select('assignment_id, status')
        .eq('user_id', user?.id);

      const submissionsMap = new Map(submissionsData?.map((s: any) => [s.assignment_id, s.status]));

      return (assignmentsData as any[])?.map((assignment: any) => ({
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

  // Fetch student's attendance records for this course
  const { data: attendanceRecords } = useQuery({
    queryKey: ['student-course-attendance', courseId, user?.id, course?.calendar_id],
    queryFn: async () => {
      // Get all events for this course's calendar
      const { data: events, error: eventsErr } = await supabase
        .from('gw_events')
        .select('id, title, start_date')
        .eq('calendar_id', course.calendar_id)
        .order('start_date', { ascending: false });
      if (eventsErr) throw eventsErr;
      if (!events?.length) return [];

      const eventIds = events.map(e => e.id);
      const eventMap = new Map(events.map(e => [e.id, e]));

      // Get attendance for these events
      const { data: attendance, error: attErr } = await supabase
        .from('gw_event_attendance')
        .select('event_id, attendance_status, check_in_time')
        .eq('user_id', user!.id)
        .in('event_id', eventIds);
      if (attErr) throw attErr;

      const attendedSet = new Map(attendance?.map(a => [a.event_id, a]) || []);

      // Build full record: mark each past event as present/absent
      const now = new Date();
      return events
        .filter(e => new Date(e.start_date) <= now)
        .map(e => {
          const record = attendedSet.get(e.id);
          return {
            id: e.id,
            title: e.title,
            date: e.start_date,
            status: record?.attendance_status || 'absent',
            checkInTime: record?.check_in_time,
          };
        });
    },
    enabled: !!user && !!course?.calendar_id,
  });

  // Fetch schedule conflicts with MUS 070 rehearsal (MWF 5:00-6:15 PM)
  const { data: scheduleConflicts } = useQuery({
    queryKey: ['student-schedule-conflicts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_class_schedules')
        .select('course_name, course_code, days, start_time, end_time, conflict_details')
        .eq('user_id', user!.id)
        .eq('has_conflict', true)
        .eq('semester', 'Spring 2026');
      if (error) throw error;
      return data;
    },
    enabled: !!user && courseId === 'a0000000-0000-0000-0000-000000000070',
  });

  if (courseLoading || assignmentsLoading || gradeLoading) {
    return <LoadingSpinner size="lg" text="Loading course..." />;
  }

  const getGradeColor = (pct: number) => {
    if (pct >= 90) return 'text-green-600 dark:text-green-400';
    if (pct >= 80) return 'text-blue-600 dark:text-blue-400';
    if (pct >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (pct >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const isMus240 = courseId === '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <Check className="h-4 w-4 text-green-600" />;
      case 'excused': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'late': return <Clock className="h-4 w-4 text-orange-600" />;
      default: return <X className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'excused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'late': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => {
          const courseConfig = ACADEMY_COURSES.find(c => c.id === courseId);
          navigate(courseConfig?.route || '/dashboard');
        }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold">{course?.course_code}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{course?.course_name}</p>
        </div>
      </div>

      {/* Grade Hero */}
      <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #003366 0%, #004d99 60%, #7cb9e8 100%)' }}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="h-5 w-5 text-white/80" />
              <span className="text-white/80 text-sm font-medium">Current Grade</span>
            </div>
            <div className="text-white text-4xl font-black">{letterGrade}</div>
            {!isAttendanceOnly && (
              <div className="text-white/70 text-sm mt-1">{percentage}%</div>
            )}
          </div>
          <div className="text-right text-white/60 text-xs">
            {isAttendanceOnly ? 'Attendance-based' : 'Deductive model'}
          </div>
        </div>
      </div>

      {/* Attendance Record Grid */}
      {attendanceRecords && attendanceRecords.length > 0 && (
        <Collapsible defaultOpen={false}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2 text-left">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Attendance Record
                    </CardTitle>
                    <CardDescription className="text-left mt-1">
                      {attendanceRecords.filter(r => r.status === 'present').length} / {attendanceRecords.length} sessions attended
                    </CardDescription>
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attendanceRecords.slice(0, 20).map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/30"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getStatusIcon(record.status)}
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{record.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(record.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] capitalize shrink-0 ml-2", getStatusColor(record.status))}>
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn("grid w-full", isAttendanceOnly ? "grid-cols-2" : "grid-cols-3")}>
          <TabsTrigger value="grades" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Grades</span>
          </TabsTrigger>
          {!isAttendanceOnly && (
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Work</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="polls" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Polls</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══ Grades Tab ═══ */}
        <TabsContent value="grades" className="mt-6 space-y-4">
          {isAttendanceOnly ? (
            /* ── Attendance-Only Model (MUS 070) ── */
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Allowed Absences</span>
                    </div>
                    <span className="text-lg font-bold text-primary">{stats.allowedAbsences ?? 2}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-destructive" />
                      <span className="font-semibold">Your Unexcused Absences</span>
                    </div>
                    <span className={cn(
                      "text-lg font-bold",
                      (stats.excessAbsences ?? 0) > 0 ? "text-destructive" : "text-green-600"
                    )}>
                      {stats.absenceCount}
                    </span>
                  </div>

                  {(stats.excessAbsences ?? 0) > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        {stats.excessAbsences} absence{(stats.excessAbsences ?? 0) !== 1 ? 's' : ''} beyond the allowed {stats.allowedAbsences} —
                        grade dropped {stats.excessAbsences} letter grade{(stats.excessAbsences ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    <strong>Grading Policy:</strong> Grades are based entirely on attendance.
                    Each member is allowed <strong>{stats.allowedAbsences ?? 2} unexcused absences</strong> per semester.
                    Each additional absence drops the grade by one full letter.
                  </p>
                </CardContent>
              </Card>

              {/* Schedule Conflicts Card */}
              <Card className={cn(
                scheduleConflicts && scheduleConflicts.length > 0
                  ? "border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20"
                  : "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20"
              )}>
                <CardHeader className="pb-2">
                  <CardTitle className={cn("text-sm flex items-center gap-2",
                    scheduleConflicts && scheduleConflicts.length > 0
                      ? "text-orange-700 dark:text-orange-400"
                      : "text-green-700 dark:text-green-400"
                  )}>
                    {scheduleConflicts && scheduleConflicts.length > 0 ? (
                      <><AlertCircle className="h-4 w-4" /> Schedule Conflicts with Rehearsal</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4" /> No Schedule Conflicts</>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {scheduleConflicts && scheduleConflicts.length > 0
                      ? "These classes overlap with MUS 070 rehearsal (MWF 5:00–6:15 PM)"
                      : "None of your classes conflict with MUS 070 rehearsal (MWF 5:00–6:15 PM)"}
                  </CardDescription>
                </CardHeader>
                {scheduleConflicts && scheduleConflicts.length > 0 && (
                  <CardContent className="space-y-2">
                    {scheduleConflicts.map((conflict: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/50">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {conflict.course_code || conflict.course_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {conflict.days?.join(', ')} · {conflict.start_time?.slice(0, 5)}–{conflict.end_time?.slice(0, 5)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 shrink-0 ml-2">
                          Conflict
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>

              {/* Rehearsal Conflict Excuse Requests */}
              <RehearsalConflictForm />

              {/* Super Admin Approval Card */}
              <AdminConflictApproval />
            </div>
          ) : (
            /* ── Standard Deductive Model ── */
            <div className="space-y-4">
              {/* Syllabus Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {gradingConfig.courseCode} Syllabus Weights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {gradingConfig.components.map((comp, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{comp.component}</div>
                        {comp.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">{comp.description}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-3 shrink-0">{comp.weight}%</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Deductions Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Minus className="h-4 w-4 text-destructive" />
                    Deductions from 100%
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Assignment Deductions</span>
                    <span className={cn("font-semibold", deductions.assignments > 0 ? "text-destructive" : "text-muted-foreground")}>
                      {deductions.assignments > 0 ? `-${deductions.assignments}%` : '0%'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">Attendance Deductions</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({stats.absenceCount} absence{stats.absenceCount !== 1 ? 's' : ''} × 2%)
                      </span>
                    </div>
                    <span className={cn("font-semibold", deductions.attendance > 0 ? "text-destructive" : "text-muted-foreground")}>
                      {deductions.attendance > 0 ? `-${deductions.attendance}%` : '0%'}
                    </span>
                  </div>
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="font-semibold">Current Grade</span>
                    <span className={cn("text-xl font-bold", getGradeColor(percentage))}>
                      {percentage}% ({letterGrade})
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl font-bold">{stats.assignmentCount}</div>
                    <div className="text-xs text-muted-foreground">Assignments</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl font-bold">{stats.gradedCount}</div>
                    <div className="text-xs text-muted-foreground">Graded</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl font-bold">{stats.absenceCount}</div>
                    <div className="text-xs text-muted-foreground">Absences</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ Assignments Tab ═══ */}
        {!isAttendanceOnly && (
          <TabsContent value="assignments" className="mt-6">
            <div className="grid gap-3">
              {assignments?.map((assignment: any) => {
                const assignmentGrade = grades?.find((g: any) => g.assignment_id === assignment.id);

                return (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {assignment.title}
                        </span>
                        <Badge variant={
                          assignment.submissionStatus === 'graded' ? 'default' :
                          assignment.submissionStatus === 'submitted' ? 'secondary' :
                          'outline'
                        }>
                          {assignment.submissionStatus}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                        </span>
                        {assignmentGrade ? (
                          <span className="font-semibold text-foreground">
                            {assignmentGrade.points_awarded} / {assignment.points} pts
                          </span>
                        ) : (
                          <span>{assignment.points} pts</span>
                        )}
                      </div>
                      {assignmentGrade?.feedback && (
                        <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                          {assignmentGrade.feedback}
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => navigate(`/grading/student/assignment/${assignment.id}`)}
                      >
                        View
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {!assignments || assignments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No assignments yet.</p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </TabsContent>
        )}

        {/* ═══ Polls Tab ═══ */}
        <TabsContent value="polls" className="mt-6">
          <StudentPollInterface courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
