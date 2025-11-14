import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';

interface AssignmentSubmissionsViewProps {
  assignmentId: string;
}

export const AssignmentSubmissionsView: React.FC<AssignmentSubmissionsViewProps> = ({ assignmentId }) => {
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

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['gw-assignment-submissions', assignmentId],
    queryFn: async () => {
      // Fetch submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('gw_submissions' as any)
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Fetch student profiles separately
      const studentIds = [...new Set(submissionsData?.map((s: any) => s.student_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      // Merge the data
      const profileMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.user_id] = p;
        return acc;
      }, {});

      return (submissionsData || []).map((submission: any) => ({
        ...submission,
        gw_profiles: profileMap[submission.student_id]
      }));
    },
  });

  if (assignmentLoading || submissionsLoading) {
    return <LoadingSpinner size="lg" text="Loading submissions..." />;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(`/grading/instructor/course/${assignment?.course_id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{assignment?.title || assignment?.name || 'Untitled Assignment'}</h1>
          <p className="text-muted-foreground">{assignment?.gw_courses?.course_name}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {submissions?.map((submission) => (
          <Card key={submission.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {submission.gw_profiles?.full_name || submission.gw_profiles?.email}
                </span>
                <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                  {submission.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                Submitted: {new Date(submission.submitted_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate(`/grading/instructor/submission/${submission.id}`)}
              >
                Grade Submission
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!submissions || submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No submissions yet.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
