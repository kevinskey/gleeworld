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
        .from('gw_assignments' as any)
        .select('*, gw_courses(*)')
        .eq('id', assignmentId)
        .single();

      if (error) throw error;
      return data as any;
    },
  });
  
  const isMus240Journal = assignment?.legacy_source === 'mus240_assignments' || assignment?.assignment_type === 'listening_journal';

  const { data: submissions, isLoading: submissionsLoading, error: submissionsError, refetch } = useQuery({
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
        
        // Fetch profiles
        const { data: profiles } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email')
          .in('user_id', studentIds);

        const profileMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.user_id] = p;
          return acc;
        }, {});

        // Fetch grades for these journals
        const journalIds = journalsData?.map((j: any) => j.id) || [];
        const { data: gradesData } = await supabase
          .from('mus240_journal_grades' as any)
          .select('*')
          .in('journal_id', journalIds);

        const gradesMap = (gradesData || []).reduce((acc: any, grade: any) => {
          acc[grade.journal_id] = grade;
          return acc;
        }, {});

        return (journalsData || []).map((journal: any) => {
          const grade = gradesMap[journal.id];
          const finalScore = grade?.instructor_score ?? grade?.overall_score;
          const finalGrade = grade?.instructor_letter_grade ?? grade?.letter_grade;
          
          // Calculate actual earned points and max points from rubric
          let earnedPoints = 0;
          let maxPoints = 0;
          if (grade?.rubric?.scores) {
            for (const criterion of grade.rubric.scores) {
              earnedPoints += criterion.score || 0;
              maxPoints += criterion.max_score || 0;
            }
          }
          
          // Calculate percentage (0-100)
          const percentageGrade = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;
          
          return {
            ...journal,
            status: journal.is_published ? 'published' : 'submitted',
            gw_profiles: profileMap[journal.student_id],
            _type: 'mus240_journal',
            // Add grade data to submission object - use calculated percentage
            grade: percentageGrade,
            graded_at: grade?.instructor_graded_at ?? grade?.graded_at,
            graded_by: grade?.instructor_graded_by ?? null,
            feedback: grade?.rubric ? JSON.stringify({
              letterGrade: finalGrade,
              totalScore: earnedPoints,
              maxPoints: maxPoints,
              criteriaScores: grade.rubric?.scores || [],
              overallFeedback: grade?.instructor_feedback ?? grade?.ai_feedback,
              aiDetection: {
                is_flagged: journal.ai_detected || false,
                confidence: journal.ai_detection_score || 0,
              }
            }) : null,
          };
        });
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

      {/* Rubric Display for MUS240 Journals */}
      {isMus240Journal && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Grading Rubric
                </CardTitle>
                <CardDescription>
                  MUS240 Listening Journal Assessment Criteria
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    View Full Rubric
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>MUS240 Listening Journal Rubric</DialogTitle>
                    <DialogDescription>
                      Total Points: 100 | This rubric is used for AI-assisted grading
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-2">Musical Elements Identification (30 points)</h4>
                      <p className="text-sm text-muted-foreground">
                        Identifies specific African musical elements (call-and-response, improvisation, polyrhythm, timbre) with accurate examples from recordings
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-2">Cultural & Historical Understanding (30 points)</h4>
                      <p className="text-sm text-muted-foreground">
                        Explains practical, spiritual, and emotional significance of music for enslaved Africans with depth and context
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-2">Blues Connection (25 points)</h4>
                      <p className="text-sm text-muted-foreground">
                        Makes clear, specific connections between early forms and blues development with concrete examples
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-2">Personal Reflection (15 points)</h4>
                      <p className="text-sm text-muted-foreground">
                        Provides thoughtful reflection on one recording with cultural significance analysis
                      </p>
                    </div>
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold mb-2">Grading Standards:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Entries must demonstrate original thinking and personal engagement with the music</li>
                        <li>Students should cite specific moments, techniques, or musical choices from recordings</li>
                        <li>Analysis should show understanding of course concepts applied to listening examples</li>
                        <li>Reflection should be substantive and go beyond surface-level description</li>
                      </ul>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="font-semibold">Musical Elements</div>
                <div className="text-2xl font-bold text-primary">30</div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="font-semibold">Cultural Context</div>
                <div className="text-2xl font-bold text-primary">30</div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="font-semibold">Blues Connection</div>
                <div className="text-2xl font-bold text-primary">25</div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="font-semibold">Reflection</div>
                <div className="text-2xl font-bold text-primary">15</div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
