import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RubricCriterion {
  name: string;
  description: string;
  maxPoints: number;
}

interface CriterionScore {
  criterion_name: string;
  points_earned: number;
  max_points: number;
  evidence: string;
  feedback: string;
}

interface AIGrade {
  totalScore: number;
  maxPoints: number;
  percentage: number;
  letterGrade: string;
  criteriaScores: CriterionScore[];
  overallStrengths: string;
  areasForImprovement: string;
  overallFeedback: string;
  gradedAt: string;
}

interface RubricGradingInterfaceProps {
  submissionId: string;
  assignmentTitle: string;
  studentName: string;
  content: string;
  existingGrade?: any;
  onGradeUpdate?: () => void;
}

export const RubricGradingInterface: React.FC<RubricGradingInterfaceProps> = ({
  submissionId,
  assignmentTitle,
  studentName,
  content,
  existingGrade,
  onGradeUpdate
}) => {
  const [isGrading, setIsGrading] = useState(false);
  const [aiGrade, setAiGrade] = useState<AIGrade | null>(
    existingGrade?.ai_feedback ? JSON.parse(existingGrade.ai_feedback) : null
  );
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [instructorFeedback, setInstructorFeedback] = useState(existingGrade?.feedback || '');
  const [finalGrade, setFinalGrade] = useState<number>(existingGrade?.grade || 0);

  const handleAIGrade = async () => {
    setIsGrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('grade-submission-ai', {
        body: { submissionId }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('AI grading rate limit exceeded. Please try again in a few moments.');
        } else if (data.error.includes('Payment required')) {
          toast.error('AI credits depleted. Please add credits to continue.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      setAiGrade(data.grade);
      toast.success('AI grading completed!');
      onGradeUpdate?.();
    } catch (error) {
      console.error('AI grading error:', error);
      toast.error('Failed to generate AI grade');
    } finally {
      setIsGrading(false);
    }
  };

  const handleManualOverride = (criterionName: string, points: number) => {
    setManualScores(prev => ({ ...prev, [criterionName]: points }));
  };

  const calculateFinalScore = () => {
    if (!aiGrade) return 0;
    
    return aiGrade.criteriaScores.reduce((total, criterion) => {
      const override = manualScores[criterion.criterion_name];
      return total + (override !== undefined ? override : criterion.points_earned);
    }, 0);
  };

  const handleSubmitGrade = async () => {
    const score = calculateFinalScore();
    
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          grade: score,
          feedback: instructorFeedback,
          graded_at: new Date().toISOString(),
          graded_by: (await supabase.auth.getUser()).data.user?.id,
          status: 'graded'
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Grade submitted successfully!');
      onGradeUpdate?.();
    } catch (error) {
      console.error('Submit grade error:', error);
      toast.error('Failed to submit grade');
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Grading Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Assisted Grading
              </CardTitle>
              <CardDescription>
                Get instant feedback and suggested scores based on rubric criteria
              </CardDescription>
            </div>
            <Button 
              onClick={handleAIGrade} 
              disabled={isGrading}
              className="gap-2"
            >
              {isGrading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Grading...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {aiGrade ? 'Re-grade with AI' : 'Grade with AI'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {aiGrade && (
          <CardContent className="space-y-4">
            {/* AI Grade Summary */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{aiGrade.letterGrade}</span>
                  <span className="text-muted-foreground">
                    {aiGrade.totalScore}/{aiGrade.maxPoints} ({aiGrade.percentage}%)
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">AI-suggested grade</p>
              </div>
            </div>

            {/* Criteria Breakdown */}
            <div className="space-y-3">
              <h4 className="font-semibold">Criteria Scores</h4>
              {aiGrade.criteriaScores.map((criterion, idx) => {
                const hasOverride = manualScores[criterion.criterion_name] !== undefined;
                const displayScore = hasOverride 
                  ? manualScores[criterion.criterion_name] 
                  : criterion.points_earned;

                return (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{criterion.criterion_name}</CardTitle>
                          <CardDescription className="mt-1">
                            AI Score: {criterion.points_earned}/{criterion.max_points}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max={criterion.max_points}
                            value={displayScore}
                            onChange={(e) => handleManualOverride(
                              criterion.criterion_name, 
                              parseFloat(e.target.value)
                            )}
                            className="w-20 text-center"
                          />
                          <span className="text-muted-foreground">/ {criterion.max_points}</span>
                          {hasOverride && <Badge variant="secondary">Override</Badge>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Evidence:</p>
                        <p className="text-sm mt-1">{criterion.evidence}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Feedback:</p>
                        <p className="text-sm mt-1">{criterion.feedback}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Overall Feedback */}
            <div className="space-y-3">
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Strengths:</p>
                <p className="text-sm text-green-800 dark:text-green-200">{aiGrade.overallStrengths}</p>
              </div>
              
              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">Areas for Improvement:</p>
                <p className="text-sm text-amber-800 dark:text-amber-200">{aiGrade.areasForImprovement}</p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Overall Feedback:</p>
                <p className="text-sm text-blue-800 dark:text-blue-200">{aiGrade.overallFeedback}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Final Grade Submission */}
      <Card>
        <CardHeader>
          <CardTitle>Finalize Grade</CardTitle>
          <CardDescription>
            Review AI suggestions, make adjustments, and submit the final grade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Final Score</Label>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-bold">{calculateFinalScore()}</span>
              <span className="text-xl text-muted-foreground">
                / {aiGrade?.maxPoints || 100}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="instructor-feedback">Additional Feedback (Optional)</Label>
            <Textarea
              id="instructor-feedback"
              value={instructorFeedback}
              onChange={(e) => setInstructorFeedback(e.target.value)}
              placeholder="Add any additional comments or feedback for the student..."
              className="mt-2 min-h-[120px]"
            />
          </div>

          <Button 
            onClick={handleSubmitGrade} 
            className="w-full"
            size="lg"
            disabled={!aiGrade}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Submit Final Grade
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
