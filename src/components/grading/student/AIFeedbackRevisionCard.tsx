import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Edit3, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface CriterionScore {
  criterion_name: string;
  points_earned: number;
  max_points: number;
  evidence: string;
  feedback: string;
}

interface AIGradeData {
  totalScore: number;
  maxPoints: number;
  percentage: number;
  letterGrade: string;
  criteriaScores: CriterionScore[];
  overallStrengths: string;
  areasForImprovement: string;
  overallFeedback: string;
  aiDetection?: {
    is_flagged: boolean;
    confidence: string;
    indicators: string[];
    reasoning: string;
  };
}

interface AIFeedbackRevisionCardProps {
  submission: any;
  assignmentId: string;
  userId: string;
  submissionTable: 'gw_assignment_submissions' | 'gw_course_submissions';
  isVideoType: boolean;
}

export const AIFeedbackRevisionCard: React.FC<AIFeedbackRevisionCardProps> = ({
  submission,
  assignmentId,
  userId,
  submissionTable,
  isVideoType,
}) => {
  const queryClient = useQueryClient();
  const [isRevising, setIsRevising] = useState(false);
  const [revisedContent, setRevisedContent] = useState(submission?.content || submission?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canRevise = submission?.status === 'ai_graded' && (submission?.revision_count ?? 0) === 0;
  const hasRevised = (submission?.revision_count ?? 0) > 0;

  // Parse AI feedback
  let aiFeedback: AIGradeData | null = null;
  try {
    if (submission?.ai_feedback) {
      aiFeedback = typeof submission.ai_feedback === 'string'
        ? JSON.parse(submission.ai_feedback)
        : submission.ai_feedback;
    }
  } catch {
    console.error('Failed to parse AI feedback');
  }

  if (!aiFeedback) return null;

  const handleSubmitRevision = async () => {
    if (!revisedContent.trim()) {
      toast.error('Please enter your revised content');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();

      if (submissionTable === 'gw_course_submissions') {
        const { error } = await supabase
          .from('gw_course_submissions' as any)
          .update({
            original_content: submission.content,
            content: revisedContent,
            word_count: revisedContent.trim().split(/\s+/).length,
            revision_content: revisedContent,
            revision_count: 1,
            revised_at: nowIso,
            status: 'revision_submitted',
          })
          .eq('id', submission.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gw_assignment_submissions' as any)
          .update({
            revision_notes: revisedContent,
            revision_count: 1,
            revised_at: nowIso,
            status: 'revision_submitted',
          })
          .eq('id', submission.id);

        if (error) throw error;
      }

      toast.success('Revision submitted! Your instructor will review your updated work.');
      setIsRevising(false);
      queryClient.invalidateQueries({ queryKey: ['gw-student-submission', assignmentId, userId] });
    } catch (error: any) {
      console.error('Revision submission error:', error);
      toast.error('Failed to submit revision. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-700';
    if (percentage >= 80) return 'text-blue-700';
    if (percentage >= 70) return 'text-yellow-700';
    if (percentage >= 60) return 'text-orange-700';
    return 'text-red-700';
  };

  const getGradeBadgeClass = (letter: string) => {
    if (letter.startsWith('A')) return 'bg-green-100 text-green-800 border-green-300';
    if (letter.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (letter.startsWith('C')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (letter.startsWith('D')) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <div className="space-y-4">
      {/* Rubric Grade Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Rubric Grading Feedback
            {canRevise && (
              <Badge variant="outline" className="ml-auto bg-amber-50 text-amber-800 border-amber-300">
                1 Revision Available
              </Badge>
            )}
            {hasRevised && (
              <Badge variant="outline" className="ml-auto bg-green-50 text-green-800 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Revision Submitted
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Overview */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className={`text-4xl font-bold ${getScoreColor(aiFeedback.percentage)}`}>
              {aiFeedback.letterGrade}
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-foreground">
                {aiFeedback.totalScore} / {aiFeedback.maxPoints}
              </p>
              <p className="text-sm text-muted-foreground">
                {aiFeedback.percentage}% — Preliminary Rubric Score
              </p>
              <Progress value={aiFeedback.percentage} className="h-2 mt-1" />
            </div>
          </div>

          {/* Criteria Breakdown */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Score Breakdown</h4>
            {aiFeedback.criteriaScores.map((criterion, idx) => {
              const pct = (criterion.points_earned / criterion.max_points) * 100;
              return (
                <div key={idx} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{criterion.criterion_name}</span>
                    <span className={`font-semibold ${getScoreColor(pct)}`}>
                      {criterion.points_earned}/{criterion.max_points}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-sm text-muted-foreground">{criterion.feedback}</p>
                </div>
              );
            })}
          </div>

          {/* Strengths & Improvements */}
          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-green-200 bg-green-50">
              <p className="text-sm font-semibold text-green-900 mb-1">Strengths:</p>
              <p className="text-sm text-green-900">{aiFeedback.overallStrengths}</p>
            </div>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
              <p className="text-sm font-semibold text-amber-900 mb-1">Areas for Improvement:</p>
              <p className="text-sm text-amber-900">{aiFeedback.areasForImprovement}</p>
            </div>
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
              <p className="text-sm font-semibold text-blue-900 mb-1">Overall Feedback:</p>
              <p className="text-sm text-blue-900">{aiFeedback.overallFeedback}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revision Section */}
      {canRevise && !isVideoType && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Edit3 className="h-5 w-5" />
              Revise Your Submission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-900">
                You have <strong>one opportunity</strong> to revise your work based on the rubric feedback above.
                After submitting your revision, your instructor will grade the updated version.
              </AlertDescription>
            </Alert>

            {!isRevising ? (
              <Button onClick={() => setIsRevising(true)} variant="outline" className="gap-2">
                <Edit3 className="h-4 w-4" />
                Start Revision
              </Button>
            ) : (
              <div className="space-y-3">
                <Textarea
                  value={revisedContent}
                  onChange={(e) => setRevisedContent(e.target.value)}
                  rows={12}
                  placeholder="Edit your submission here..."
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitRevision}
                    disabled={isSubmitting || !revisedContent.trim()}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      'Submitting...'
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Revision
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => setIsRevising(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hasRevised && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-700" />
          <AlertDescription className="text-green-900">
            Your revision was submitted on {new Date(submission.revised_at).toLocaleString()}.
            Your instructor will review your updated submission for final grading.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
