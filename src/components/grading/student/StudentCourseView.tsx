import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';

interface StudentCourseViewProps {
  courseId: string;
}

export const StudentCourseView: React.FC<StudentCourseViewProps> = ({ courseId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
        .select('*, gw_assignments(points)')
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
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('gw_assignments' as any)
        .select('*')
        .eq('course_id', courseId)
        .order('due_at', { ascending: true });

      if (assignmentsError) throw assignmentsError;

      const { data: submissionsData, error: submissionsError } = await supabase
        .from('gw_submissions' as any)
        .select('assignment_id, status')
        .eq('student_id', user?.id);

      if (submissionsError) throw submissionsError;

      const submissionsMap = new Map(submissionsData?.map((s: any) => [s.assignment_id, s.status]));

      return (assignmentsData as any[])?.map((assignment: any) => ({
        ...assignment,
        submissionStatus: submissionsMap.get(assignment.id) || 'not_submitted'
      }));
    },
    enabled: !!user,
  });

  const totalEarned = grades?.reduce((sum, g) => sum + (g.points_awarded || 0), 0) || 0;
  const totalPossible = grades?.reduce((sum, g) => sum + (g.gw_assignments?.points || 0), 0) || 0;
  const percentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
  const letterGrade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';

  if (courseLoading || assignmentsLoading || gradesLoading) {
    return <LoadingSpinner size="lg" text="Loading course..." />;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/grading/student/dashboard')}>
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
                  Due: {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'No due date'}
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
      </div>

      {!assignments || assignments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No assignments yet.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
