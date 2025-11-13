import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';

interface StudentAssignmentViewProps {
  assignmentId: string;
}

export const StudentAssignmentView: React.FC<StudentAssignmentViewProps> = ({ assignmentId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['gw-assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_assignments' as any)
        .select('*, gw_courses(*)')
        .eq('id', assignmentId)
        .single();

      if (error) throw error;
      return data as any;
    },
  });

  const { data: submission, isLoading: submissionLoading } = useQuery({
    queryKey: ['gw-student-submission', assignmentId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_submissions' as any)
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  if (assignmentLoading || submissionLoading) {
    return <LoadingSpinner size="lg" text="Loading assignment..." />;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(`/grading/student/course/${assignment?.course_id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{assignment?.title}</h1>
          <p className="text-muted-foreground">{assignment?.gw_courses?.course_name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Assignment Details</span>
            {submission && (
              <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                {submission.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Points:</h3>
            <p>{assignment?.points}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Due Date:</h3>
            <p>{assignment?.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Description:</h3>
            <p className="text-muted-foreground">{assignment?.description || 'No description provided'}</p>
          </div>
          {submission && (
            <div>
              <h3 className="font-semibold mb-2">Your Submission:</h3>
              <div className="p-4 bg-muted rounded-lg">
                <pre className="whitespace-pre-wrap">{submission.content}</pre>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Submitted: {new Date(submission.submitted_at).toLocaleString()}
              </p>
            </div>
          )}
          {!submission && (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">You haven't submitted this assignment yet.</p>
              <p className="text-sm text-muted-foreground">Submission interface coming soon...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
