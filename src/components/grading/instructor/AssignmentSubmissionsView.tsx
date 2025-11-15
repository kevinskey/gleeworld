import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ShieldAlert } from 'lucide-react';
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
  
  const isMus240Journal = assignment?.legacy_source === 'mus240_assignments' || assignment?.assignment_type === 'listening_journal';

  const { data: submissions, isLoading: submissionsLoading, error: submissionsError } = useQuery({
    queryKey: ['gw-assignment-submissions', assignmentId, isMus240Journal, assignment?.legacy_id, assignment?.title],
    enabled: !!assignment,
    queryFn: async () => {
      if (isMus240Journal) {
        // Determine correct legacy assignment id for MUS240 journals
        let legacyIdToUse = assignment?.legacy_id as string | undefined;
        if (assignment?.legacy_source !== 'mus240_assignments') {
          // Derive from title like "Listening Journal 4" -> "lj4"
          const match = (assignment?.title || '').match(/Listening\s*Journal\s*(\d+)/i);
          if (match?.[1]) {
            legacyIdToUse = `lj${match[1]}`;
          }
        }

        const { data: journalsData, error: journalsError } = await supabase
          .from('mus240_journal_entries' as any)
          .select('*')
          .eq('assignment_id', legacyIdToUse)
          .order('submitted_at', { ascending: false });

        if (journalsError) throw journalsError;

        const studentIds = [...new Set(journalsData?.map((j: any) => j.student_id) || [])];
        const { data: profiles } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email')
          .in('user_id', studentIds);

        const profileMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.user_id] = p;
          return acc;
        }, {});

        return (journalsData || []).map((journal: any) => ({
          ...journal,
          status: journal.is_published ? 'published' : 'submitted',
          gw_profiles: profileMap[journal.student_id],
          _type: 'mus240_journal',
        }));
      }

      // Default: standard assignment submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions' as any)
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      const studentIds = [...new Set(submissionsData?.map((s: any) => s.student_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      const profileMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.user_id] = p;
        return acc;
      }, {});

      return (submissionsData || []).map((submission: any) => ({
        ...submission,
        gw_profiles: profileMap[submission.student_id],
        _type: 'standard',
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
          <h1 className="text-3xl font-bold">{assignment?.title || 'Untitled Assignment'}</h1>
          <p className="text-muted-foreground">{assignment?.gw_courses?.course_name}</p>
        </div>
      </div>

      {submissionsError && (
        <Card>
          <CardContent className="py-4">
            <p className="text-destructive text-sm">{submissionsError.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {submissions?.map((submission) => (
          <Card key={submission.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {submission.gw_profiles?.full_name || submission.gw_profiles?.email}
                </span>
                <div className="flex items-center gap-2">
                  {submission.ai_detected && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      AI Detected
                    </Badge>
                  )}
                  <Badge variant={submission.status === 'graded' ? 'default' : submission.status === 'flagged' ? 'destructive' : 'secondary'}>
                    {submission.status}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Submitted: {new Date(submission.submitted_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() =>
                  navigate(
                    (assignment?.legacy_source === 'mus240_assignments' || assignment?.assignment_type === 'listening_journal')
                      ? `/classes/mus240/journal/${submission.id}/review`
                      : `/grading/instructor/submission/${submission.id}`,
                    {
                      state: { fromGradingSystem: true }
                    }
                  )
                }
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
