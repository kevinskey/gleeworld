import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Calendar, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { RubricGradingInterface } from './RubricGradingInterface';
import { format } from 'date-fns';

interface SubmissionGradingViewProps {
  submissionId: string;
}

export const SubmissionGradingView: React.FC<SubmissionGradingViewProps> = ({ submissionId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const submissionTable = (location.state as any)?.submissionTable || 'gw_assignment_submissions';

  const { data: submission, isLoading, refetch } = useQuery({
    queryKey: ['gw-submission', submissionId, submissionTable],
    queryFn: async () => {
      if (submissionTable === 'gw_course_submissions') {
        // Fetch from gw_course_submissions (essay submissions)
        const { data, error } = await supabase
          .from('gw_course_submissions' as any)
          .select('*')
          .eq('id', submissionId)
          .single();

        if (error) throw error;
        const base: any = data as any;

        // Fetch assignment info
        let assignmentData: any = null;
        if (base?.assignment_id) {
          const { data: aData } = await supabase
            .from('gw_course_assignments')
            .select('title, description, points')
            .eq('id', base.assignment_id)
            .maybeSingle();
          assignmentData = aData;
        }

        // Fetch profile
        let profile: any = null;
        if (base?.student_id) {
          const { data: profileData } = await supabase
            .from('gw_profiles')
            .select('full_name, email')
            .eq('user_id', base.student_id)
            .maybeSingle();
          profile = profileData;
        }

        return {
          ...base,
          user_id: base.student_id,
          notes: base.content,
          gw_course_assignments: assignmentData,
          gw_profiles: profile,
          _table: 'gw_course_submissions',
        } as any;
      }

      // Default: gw_assignment_submissions
      const { data, error } = await supabase
        .from('gw_assignment_submissions' as any)
        .select('*, gw_course_assignments(title, description, points)')
        .eq('id', submissionId)
        .single();

      if (error) throw error;

      const base: any = data as any;

      let profile: any = null;
      if (base?.user_id) {
        const { data: profileData } = await supabase
          .from('gw_profiles')
          .select('full_name, email')
          .eq('user_id', base.user_id)
          .maybeSingle();
        profile = profileData;
      }

      return { ...base, gw_profiles: profile, _table: 'gw_assignment_submissions' } as any;
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
            {submission?.gw_profiles?.full_name} - {submission?.gw_course_assignments?.title || 'Untitled Assignment'}
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

          {/* Revision Notice */}
          {submission?.revision_count > 0 && (
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="h-4 w-4 text-blue-700" />
                <p className="text-sm font-semibold text-blue-900">Student Revised This Submission</p>
              </div>
              <p className="text-sm text-blue-800">
                Revised on {submission.revised_at ? new Date(submission.revised_at).toLocaleString() : 'unknown'}.
                The content below reflects the student's revised work.
              </p>
            </div>
          )}

          <div className="p-4 bg-muted rounded-lg">
            {submission?.content || submission?.notes || submission?.recording_url ? (
              <div className="space-y-2">
                {(submission.content || submission.notes) && (
                  <pre className="whitespace-pre-wrap font-sans">{submission.content || submission.notes}</pre>
                )}
                {submission.recording_url && (
                  submission.recording_url.includes('.webm') || 
                  submission.recording_url.includes('.mp4') || 
                  submission.recording_url.includes('.mov') ? (
                    <video 
                      controls 
                      src={submission.recording_url} 
                      className="w-full rounded-lg max-h-[500px]"
                    />
                  ) : (
                    <audio controls src={submission.recording_url} className="w-full" />
                  )
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No content submitted</p>
            )}
          </div>

          {/* Show original content if revised */}
          {submission?.original_content && submission?.revision_count > 0 && (
            <details className="mt-2">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                View Original Submission
              </summary>
              <div className="p-4 bg-muted/50 rounded-lg mt-2 border border-dashed">
                <pre className="whitespace-pre-wrap font-sans text-sm">{submission.original_content}</pre>
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* AI Grading Interface */}
      <RubricGradingInterface
        submissionId={submissionId}
        assignmentId={submission?.assignment_id}
        assignmentTitle={submission?.gw_course_assignments?.title || 'Assignment'}
        studentName={submission?.gw_profiles?.full_name || submission?.gw_profiles?.email || 'Student'}
        content={submission?.content || submission?.notes || ''}
        existingGrade={submission}
        onGradeUpdate={() => refetch()}
      />
    </div>
  );
};
