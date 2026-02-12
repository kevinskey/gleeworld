import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, Loader2, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';
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

interface AIDetection {
  is_flagged: boolean;
  confidence: 'low' | 'medium' | 'high';
  indicators: string[];
  reasoning: string;
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
  aiDetection: AIDetection;
  gradedAt: string;
}

interface RubricGradingInterfaceProps {
  submissionId: string;
  assignmentId?: string;
  assignmentTitle: string;
  studentName: string;
  content: string;
  existingGrade?: any;
  onGradeUpdate?: () => void;
}

export const RubricGradingInterface: React.FC<RubricGradingInterfaceProps> = ({
  submissionId,
  assignmentId,
  assignmentTitle,
  studentName,
  content,
  existingGrade,
  onGradeUpdate
}) => {
  const navigate = useNavigate();
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
    setManualScores((prev) => ({ ...prev, [criterionName]: points }));
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
      const { error } = await supabase.
      from('gw_assignment_submissions').
      update({
        score_value: score,
        feedback: instructorFeedback,
        graded_at: new Date().toISOString(),
        graded_by: (await supabase.auth.getUser()).data.user?.id,
        status: 'graded'
      }).
      eq('id', submissionId);

      if (error) throw error;

      toast.success('Grade submitted successfully!');
      onGradeUpdate?.();
      // Navigate back to assignment submissions list
      if (assignmentId) {
        setTimeout(() => {
          navigate(`/grading/instructor/assignment/${assignmentId}/submissions`);
        }, 500);
      }
    } catch (error) {
      console.error('Submit grade error:', error);
      toast.error('Failed to submit grade');
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Grading Section */}
      <Card className="bg-white dark:bg-card border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: '#0f172a' }}>
                <Sparkles className="h-5 w-5 text-primary" />
                Rubric-Based Grading
              </CardTitle>
              <CardDescription style={{ color: '#334155' }}>
                Get instant feedback and suggested scores based on rubric criteria
              </CardDescription>
            </div>
            <Button
              onClick={handleAIGrade}
              disabled={isGrading}
              className="gap-2">

              {isGrading ?
              <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Grading...
                </> :

              <>
                  <Sparkles className="h-4 w-4" />
                  {aiGrade ? 'Re-grade with AI' : 'Grade with AI'}
                </>
              }
            </Button>
          </div>
        </CardHeader>
        {aiGrade &&
        <CardContent className="space-y-4">
            {/* AI Detection Warning */}
            {aiGrade.aiDetection?.is_flagged &&
          <Alert variant="destructive" className="border-red-500">
                <ShieldAlert className="h-5 w-5" />
                <AlertTitle className="flex items-center gap-2">
                  ⚠️ Potential AI-Generated Content Detected
                  <Badge variant="destructive" className="ml-2">
                    {aiGrade.aiDetection.confidence.toUpperCase()} CONFIDENCE
                  </Badge>
                </AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p className="font-medium">{aiGrade.aiDetection.reasoning}</p>
                  <div>
                    <p className="text-sm font-semibold mb-1">Indicators:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {aiGrade.aiDetection.indicators.map((indicator, idx) =>
                  <li key={idx}>{indicator}</li>
                  )}
                    </ul>
                  </div>
                  <p className="text-sm italic mt-2">
                    Review this submission carefully. Consider discussing with the student or requesting resubmission.
                  </p>
                </AlertDescription>
              </Alert>
          }

      {/* AI Grade Summary */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg" style={{ color: '#0f172a' }}>
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold" style={{ color: '#0f172a' }}>{aiGrade.letterGrade}</span>
                  <span style={{ color: '#334155' }}>
                    {aiGrade.totalScore}/{aiGrade.maxPoints} ({aiGrade.percentage}%)
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#334155' }}>Suggested rubric grade</p>
              </div>
            </div>

            {/* Criteria Breakdown */}
            <div className="space-y-3">
              <h4 className="font-semibold" style={{ color: '#0f172a' }}>Criteria Scores</h4>
              {aiGrade.criteriaScores.map((criterion, idx) => {
              const hasOverride = manualScores[criterion.criterion_name] !== undefined;
              const displayScore = hasOverride ?
              manualScores[criterion.criterion_name] :
              criterion.points_earned;

              return (
                <Card key={idx} className="bg-white dark:bg-card border shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg" style={{ color: '#0f172a' }}>{criterion.criterion_name}</CardTitle>
                          <CardDescription className="mt-1" style={{ color: '#334155' }}>
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
                          className="w-20 text-center" />

                          <span style={{ color: '#334155' }}>/ {criterion.max_points}</span>
                          {hasOverride && <Badge variant="secondary">Override</Badge>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#64748b' }}>Evidence:</p>
                        <p className="text-sm mt-1" style={{ color: '#0f172a' }}>{criterion.evidence}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#64748b' }}>Feedback:</p>
                        <p className="text-sm mt-1" style={{ color: '#0f172a' }}>{criterion.feedback}</p>
                      </div>
                    </CardContent>
                  </Card>);

            })}
            </div>

            {/* Overall Feedback */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-green-200 bg-green-50" style={{ backgroundColor: '#f0fdf4' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#14532d' }}>Strengths:</p>
                <p className="text-sm" style={{ color: '#166534' }}>{aiGrade.overallStrengths}</p>
              </div>
              
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50" style={{ backgroundColor: '#fffbeb' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#78350f' }}>Areas for Improvement:</p>
                <p className="text-sm" style={{ color: '#92400e' }}>{aiGrade.areasForImprovement}</p>
              </div>

              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50" style={{ backgroundColor: '#eff6ff' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#1e3a5f' }}>Overall Feedback:</p>
                <p className="text-sm" style={{ color: '#1e40af' }}>{aiGrade.overallFeedback}</p>
              </div>
            </div>
          </CardContent>
        }
      </Card>

      {/* Final Grade Submission */}
      <Card className="bg-white dark:bg-card border shadow-sm">
        <CardHeader>
          <CardTitle style={{ color: '#0f172a' }}>Finalize Grade</CardTitle>
          <CardDescription style={{ color: '#334155' }}>
            Review suggestions, make adjustments, and submit the final grade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label style={{ color: '#0f172a' }}>Final Score</Label>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-bold" style={{ color: '#0f172a' }}>{calculateFinalScore()}</span>
              <span className="text-xl" style={{ color: '#334155' }}>
                / {aiGrade?.maxPoints || 100}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="instructor-feedback" style={{ color: '#0f172a' }}>Additional Feedback (Optional)</Label>
            <Textarea
              id="instructor-feedback"
              value={instructorFeedback}
              onChange={(e) => setInstructorFeedback(e.target.value)}
              placeholder="Add any additional comments or feedback for the student..."
              className="mt-2 min-h-[120px]" />

          </div>

          <Button
            onClick={handleSubmitGrade}
            className="w-full"
            size="lg"
            disabled={!aiGrade}>

            <CheckCircle className="h-4 w-4 mr-2" />
            Submit Final Grade
          </Button>
        </CardContent>
      </Card>
    </div>);

};