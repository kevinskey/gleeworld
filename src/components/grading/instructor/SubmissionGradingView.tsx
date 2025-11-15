import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { RubricGradingInterface } from './RubricGradingInterface';
import { format } from 'date-fns';

interface SubmissionGradingViewProps {
  submissionId: string;
}

export const SubmissionGradingView: React.FC<SubmissionGradingViewProps> = ({ submissionId }) => {
  const navigate = useNavigate();

  const { data: submission, isLoading, refetch } = useQuery({
    queryKey: ['gw-submission', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignment_submissions' as any)
        .select('*, gw_assignments(title, description, points), gw_profiles(full_name, email)')
        .eq('id', submissionId)
        .single();

      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading submission..." />;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(`/grading/instructor/assignment/${submission?.assignment_id}/submissions`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Grade Submission</h1>
          <p className="text-muted-foreground">
            {submission?.gw_profiles?.full_name} - {submission?.gw_assignments?.title || 'Untitled Assignment'}
          </p>
        </div>
      </div>

      {/* Submission Content */}
      <Card>
        <CardHeader>
          <CardTitle>Submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {submission?.gw_profiles?.full_name || submission?.gw_profiles?.email}
            </span>
            {submission?.submitted_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Submitted {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
              </span>
            )}
          </div>
          <div className="p-4 bg-muted rounded-lg">
            {submission?.content || submission?.text ? (
              <pre className="whitespace-pre-wrap font-sans">
                {submission.content || submission.text}
              </pre>
            ) : (
              <p className="text-muted-foreground">No content submitted</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Grading Interface */}
      <RubricGradingInterface
        submissionId={submissionId}
        assignmentTitle={submission?.gw_assignments?.title || 'Assignment'}
        studentName={submission?.gw_profiles?.full_name || submission?.gw_profiles?.email || 'Student'}
        content={submission?.content || submission?.text || ''}
        existingGrade={submission}
        onGradeUpdate={() => refetch()}
      />
    </div>
  );
};
