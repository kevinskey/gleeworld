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

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['gw-student-assignments', courseId, user?.id],
    queryFn: async () => {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('gw_assignments' as any)
        .select('*')
        .eq('course_id', courseId)
        .order('due_date', { ascending: true });

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

  if (courseLoading || assignmentsLoading) {
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

      <div className="grid gap-4">
        {assignments?.map((assignment) => (
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
            <CardContent>
              <Button
                onClick={() => navigate(`/grading/student/assignment/${assignment.id}`)}
              >
                View Assignment
              </Button>
            </CardContent>
          </Card>
        ))}
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
