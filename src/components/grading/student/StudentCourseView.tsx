import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, BarChart3, BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { StudentPollInterface } from '@/components/course/StudentPollInterface';
import { ACADEMY_COURSES } from '@/config/academyCourses';

interface StudentCourseViewProps {
  courseId: string;
}

export const StudentCourseView: React.FC<StudentCourseViewProps> = ({ courseId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assignments');

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

  const { data: grades, isLoading: gradesLoading } = useQuery({
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

        // Fallback: infer from semester/term strings (prevents last-semester items from lingering)
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

        // term like 202601 → Jan 1, 2026
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

  const totalEarned = grades?.reduce((sum, g) => sum + (g.points_awarded || 0), 0) || 0;
  const totalPossible = grades?.reduce((sum, g) => sum + (g.gw_course_assignments?.points || 0), 0) || 0;
  const percentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
  const letterGrade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';

  if (courseLoading || assignmentsLoading || gradesLoading) {
    return <LoadingSpinner size="lg" text="Loading course..." />;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => {
          // Navigate to the course landing page if found, otherwise fallback to dashboard
          const courseConfig = ACADEMY_COURSES.find(c => c.id === courseId);
          navigate(courseConfig?.route || '/dashboard');
        }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{course?.course_code}</h1>
          <p className="text-muted-foreground">{course?.course_name}</p>
        </div>
      </div>

      {totalPossible > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Current Grade</h3>
                <p className="text-3xl font-bold text-primary">{percentage.toFixed(1)}% ({letterGrade})</p>
              </div>
              <div className="text-right text-muted-foreground">
                <p>{totalEarned} / {totalPossible} points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="polls" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Polls
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-6">
          <div className="grid gap-4">
            {assignments?.map((assignment) => {
              const assignmentGrade = grades?.find(g => g.assignment_id === assignment.id);
              
              return (
                <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {assignment.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={assignment.submissionStatus === 'graded' ? 'default' : assignment.submissionStatus === 'submitted' ? 'secondary' : 'outline'}>
                          {assignment.submissionStatus}
                        </Badge>
                        <span className="text-sm font-normal text-muted-foreground">
                          {assignment.points} pts
                        </span>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {assignmentGrade && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-semibold">
                          Grade: {assignmentGrade.points_awarded} / {assignment.points} 
                          ({((assignmentGrade.points_awarded / assignment.points) * 100).toFixed(1)}%)
                        </p>
                        {assignmentGrade.feedback && (
                          <p className="text-sm text-muted-foreground mt-1">{assignmentGrade.feedback}</p>
                        )}
                      </div>
                    )}
                    <Button
                      onClick={() => navigate(`/grading/student/assignment/${assignment.id}`)}
                    >
                      View Assignment
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            {!assignments || assignments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No assignments yet.</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="polls" className="mt-6">
          <StudentPollInterface courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
