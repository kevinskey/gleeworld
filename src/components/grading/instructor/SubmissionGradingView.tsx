import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface SubmissionGradingViewProps {
  submissionId: string;
}

export const SubmissionGradingView: React.FC<SubmissionGradingViewProps> = ({ submissionId }) => {
  const navigate = useNavigate();

  const { data: submission, isLoading } = useQuery({
    queryKey: ['gw-submission', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_submissions' as any)
        .select('*, gw_assignments(*), gw_profiles(full_name, email)')
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
            {submission?.gw_profiles?.full_name} - {submission?.gw_assignments?.title}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Student:</h3>
            <p>{submission?.gw_profiles?.full_name || submission?.gw_profiles?.email}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Submitted:</h3>
            <p>{submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Not submitted'}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Content:</h3>
            <div className="p-4 bg-muted rounded-lg">
              {submission?.content ? (
                <pre className="whitespace-pre-wrap">{submission.content}</pre>
              ) : (
                <p className="text-muted-foreground">No content</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rubric-based grading interface coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
