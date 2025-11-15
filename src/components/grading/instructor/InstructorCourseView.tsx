import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Users, BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface InstructorCourseViewProps {
  courseId: string;
}

export const InstructorCourseView: React.FC<InstructorCourseViewProps> = ({ courseId }) => {
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

  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['gw-course-assignments', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_assignments' as any)
        .select('*')
        .eq('course_id', courseId)
        .order('due_at', { ascending: true });

      if (error) throw error;
      return data as any[];
    },
  });

  if (courseLoading || assignmentsLoading) {
    return <LoadingSpinner size="lg" text="Loading course..." />;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/grading/instructor/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{course?.code}</h1>
          <p className="text-muted-foreground">{course?.title}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() => navigate(`/grading/instructor/course/${courseId}/gradebook`)}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Gradebook
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/grading/instructor/course/${courseId}/students`)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Manage Students
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Assignments: {assignments?.length ?? 0}</p>
      </div>

      {assignmentsError && (
        <Card>
          <CardContent className="py-4">
            <p className="text-destructive text-sm">
              {assignmentsError.message}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {assignments?.map((assignment) => (
          <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {assignment.title || 'Untitled Assignment'}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {assignment.points} pts
                </span>
              </CardTitle>
              <CardDescription>
                Due: {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'No due date'}
              </CardDescription>
              {assignment.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {assignment.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate(`/grading/instructor/assignment/${assignment.id}/submissions`)}
              >
                View Submissions
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
