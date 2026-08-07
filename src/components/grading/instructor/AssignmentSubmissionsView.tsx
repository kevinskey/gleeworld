import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ShieldAlert, Sparkles, Loader2, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AssignmentSubmissionsViewProps {
  assignmentId: string;
}

export const AssignmentSubmissionsView: React.FC<AssignmentSubmissionsViewProps> = ({ assignmentId }) => {
  const navigate = useNavigate();
  const [isGrading, setIsGrading] = useState(false);
  const [expandedRubrics, setExpandedRubrics] = useState<Set<string>>(new Set());

  const toggleRubric = (submissionId: string) => {
    const newExpanded = new Set(expandedRubrics);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedRubrics(newExpanded);
  };

  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['gw-assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_course_assignments')
        .select('*, gw_courses(*)')
        .eq('id', assignmentId)
        .single();

      if (error) throw error;
      return data as any;
    },
  });
  
  const { data: submissions, isLoading: submissionsLoading, error: submissionsError, refetch } = useQuery({
    queryKey: ['gw-assignment-submissions', assignmentId, assignment?.legacy_id, assignment?.title],
    enabled: !!assignment,
    queryFn: async () => {
      // Try gw_assignment_submissions first (video/recording assignments)
      const { data: gwAssignSubs, error: gwAssignErr } = await supabase
        .from('gw_assignment_submissions' as any)
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (gwAssignErr) console.warn('gw_assignment_submissions error:', gwAssignErr);

      // Also check gw_course_submissions (essay/writing assignments)
      const { data: courseSubsData, error: courseSubsErr } = await supabase
        .from('gw_course_submissions' as any)
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (courseSubsErr) console.warn('gw_course_submissions error:', courseSubsErr);

      // Merge results, preferring whichever table has data
      const gwAssignResults = gwAssignSubs || [];
      const courseSubResults = courseSubsData || [];

      // Collect all user IDs from both sources
      const allUserIds = [
        ...gwAssignResults.map((s: any) => s.user_id),
        ...courseSubResults.map((s: any) => s.student_id),
      ].filter(Boolean);
      const uniqueUserIds = [...new Set(allUserIds)];

      let profileMap: Record<string, any> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('gw_profiles_directory')
          .select('user_id, full_name, email')
          .in('user_id', uniqueUserIds);

        profileMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.user_id] = p;
          return acc;
        }, {});
      }

      // Map gw_assignment_submissions
      const mappedGwAssign = gwAssignResults.map((submission: any) => ({
        ...submission,
        student_id: submission.user_id,
        gw_profiles: profileMap[submission.user_id],
        _type: 'standard',
      }));

      // Map gw_course_submissions (essay submissions)
      const mappedCourseSubs = courseSubResults.map((submission: any) => ({
        ...submission,
        student_id: submission.student_id,
        submitted_at: submission.submitted_at || submission.created_at,
        gw_profiles: profileMap[submission.student_id],
        _type: 'course_submission',
      }));

      // Combine both, deduplicating by student_id (prefer course_submission if both exist)
      const seenStudents = new Set<string>();
      const combined: any[] = [];
      
      for (const sub of [...mappedCourseSubs, ...mappedGwAssign]) {
        const sid = sub.student_id;
        if (!seenStudents.has(sid)) {
          seenStudents.add(sid);
          combined.push(sub);
        }
      }

      return combined;
    },
  });

  const handleBulkGrade = async () => {
    if (!submissions || submissions.length === 0) {
      toast.error('No submissions to grade');
      return;
    }

    setIsGrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-grade-submissions', {
        body: { assignmentId }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(
        `Grading complete! ${data.gradedCount} submissions graded${data.failedCount > 0 ? `, ${data.failedCount} failed` : ''}`
      );
      
      if (data.errors && data.errors.length > 0) {
        console.error('Grading errors:', data.errors);
      }

      // Refresh the submissions list
      refetch();
    } catch (error) {
      console.error('Bulk grading error:', error);
      toast.error('Failed to start bulk grading');
    } finally {
      setIsGrading(false);
    }
  };

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


      {/* Bulk Grading Section */}
      {submissions && submissions.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">AI Bulk Grading</p>
                <p className="text-sm text-muted-foreground">
                  Grade all {submissions.length} submissions using AI with the improved grading rubric
                </p>
              </div>
              <Button
                onClick={handleBulkGrade}
                disabled={isGrading}
                className="gap-2"
              >
                {isGrading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Grading {submissions.length} submissions...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Grade All with AI
                  </>
                )}
              </Button>
            </div>
            {isGrading && (
              <Alert className="mt-4">
                <AlertDescription>
                  This may take a few minutes. Grading {submissions.length} submissions sequentially to ensure quality...
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {submissionsError && (
        <Card>
          <CardContent className="py-4">
            <p className="text-destructive text-sm">{submissionsError.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {submissions?.map((submission) => {
          // Parse feedback if it's JSON string
          let parsedFeedback = null;
          if (submission.feedback) {
            try {
              parsedFeedback = typeof submission.feedback === 'string' 
                ? JSON.parse(submission.feedback) 
                : submission.feedback;
            } catch (e) {
              console.error('Failed to parse feedback:', e);
            }
          }

          return (
            <Card key={submission.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {submission.gw_profiles?.full_name || submission.gw_profiles?.email}
                  </span>
                  <div className="flex items-center gap-2">
                    {(submission.ai_detected || parsedFeedback?.aiDetection?.is_flagged) && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        AI Detected
                      </Badge>
                    )}
                    {(submission.grade !== null && submission.grade !== undefined) ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xl px-4 py-2 font-bold">
                          {submission.grade}%
                        </Badge>
                        {parsedFeedback?.letterGrade && (
                          <Badge variant="outline" className="text-lg px-3 py-1.5">
                            {parsedFeedback.letterGrade}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary">Not Graded</Badge>
                    )}
                    <Badge variant={
                      submission.status === 'graded' || submission.graded_at ? 'default' : 
                      submission.status === 'flagged' ? 'destructive' : 
                      'secondary'
                    }>
                      {submission.graded_at ? 'graded' : submission.status}
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>
                  Submitted: {new Date(submission.submitted_at).toLocaleString()}
                  {submission.graded_at && (
                    <> • Graded: {new Date(submission.graded_at).toLocaleString()}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rubric Scores Breakdown */}
                {parsedFeedback?.criteriaScores && (
                  <div className="border rounded-lg bg-muted/30">
                    <button
                      onClick={() => toggleRubric(submission.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <h4 className="font-semibold flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Rubric Scoring Breakdown
                      </h4>
                      {expandedRubrics.has(submission.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {expandedRubrics.has(submission.id) && (
                      <div className="px-4 pb-4 space-y-3">
                        {parsedFeedback.criteriaScores.map((criterion: any, index: number) => (
                        <div key={index} className="border-l-4 border-primary pl-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{criterion.criterion || criterion.criterion_name}</span>
                            <span className="font-bold text-primary">
                              {criterion.score}/{criterion.max_score || criterion.max_points} points
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{criterion.feedback}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {expandedRubrics.has(submission.id) && parsedFeedback.totalScore && parsedFeedback.maxPoints && (
                      <div className="px-4 pb-4">
                        <div className="mt-4 pt-3 border-t">
                          <div className="flex items-center justify-between font-bold">
                            <span>Total Score:</span>
                            <span className="text-lg text-primary">
                              {parsedFeedback.totalScore}/{parsedFeedback.maxPoints} points
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Overall Feedback */}
                {parsedFeedback?.overallFeedback && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h4 className="font-semibold mb-2">Overall Feedback</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{parsedFeedback.overallFeedback}</p>
                  </div>
                )}

                {/* Strengths and Areas for Improvement */}
                {(parsedFeedback?.overallStrengths || parsedFeedback?.areasForImprovement) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {parsedFeedback.overallStrengths && (
                      <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/20">
                        <h4 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-400">Strengths</h4>
                        <p className="text-sm text-muted-foreground">{parsedFeedback.overallStrengths}</p>
                      </div>
                    )}
                    {parsedFeedback.areasForImprovement && (
                      <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
                        <h4 className="font-semibold text-sm mb-2 text-blue-700 dark:text-blue-400">Areas for Improvement</h4>
                        <p className="text-sm text-muted-foreground">{parsedFeedback.areasForImprovement}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Detection Warning */}
                {parsedFeedback?.aiDetection?.is_flagged && (
                  <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription>
                      <strong>AI Detection ({parsedFeedback.aiDetection.confidence} confidence):</strong>
                      <p className="mt-1 text-sm">{parsedFeedback.aiDetection.reasoning}</p>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={() => {
                    if (assignment?.assignment_type === 'listening_journal') {
                      navigate(`/academy/${assignment?.gw_courses?.course_code ?? ''}`);
                    } else if (submission._type === 'course_submission') {
                      navigate(`/grading/instructor/submission/${submission.id}`, {
                        state: { fromGradingSystem: true, submissionTable: 'gw_course_submissions' }
                      });
                    } else {
                      navigate(`/grading/instructor/submission/${submission.id}`, { state: { fromGradingSystem: true } });
                    }
                  }}
                >
                  {submission.graded_at ? 'Review Grading' : 'Grade Submission'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
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
