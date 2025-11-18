import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { CheckCircle, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RubricCriterion {
  id: string;
  criterion_name: string;
  description: string;
  max_points: number;
  weight_percentage: number;
  display_order: number;
}

interface RubricScore {
  criterion_id: string;
  criterion_name: string;
  points_earned: number;
  max_points: number;
  feedback?: string;
}

interface RubricGradingPanelProps {
  assignmentType: 'journal' | 'midterm' | 'essay';
  submissionId: string;
  onGradeSubmit: (scores: RubricScore[], totalScore: number, feedback: string) => void;
  initialScores?: RubricScore[];
  initialFeedback?: string;
}

export const RubricGradingPanel: React.FC<RubricGradingPanelProps> = ({
  assignmentType,
  submissionId,
  onGradeSubmit,
  initialScores = [],
  initialFeedback = '',
}) => {
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [scores, setScores] = useState<Record<string, RubricScore>>({});
  const [globalFeedback, setGlobalFeedback] = useState(initialFeedback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRubricCriteria();
  }, [assignmentType]);

  useEffect(() => {
    if (initialScores.length > 0) {
      const scoreMap: Record<string, RubricScore> = {};
      initialScores.forEach((score) => {
        scoreMap[score.criterion_id] = score;
      });
      setScores(scoreMap);
    }
  }, [initialScores]);

  const fetchRubricCriteria = async () => {
    try {
      setLoading(true);

      // Map assignment types to IDs (you may need to adjust these)
      const assignmentTypeIds: Record<string, string> = {
        journal: '5c84ffe6-ee05-474d-83c2-60f648fd346d',
        essay: 'acb6cd00-a2b1-44fc-99a6-7ade2b9d0d45',
        midterm: 'midterm-id', // You'll need the actual ID
      };

      const { data, error } = await supabase
        .from('mus240_rubric_criteria')
        .select('*')
        .eq('assignment_type_id', assignmentTypeIds[assignmentType] || assignmentTypeIds.journal)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setCriteria(data || []);

      // Initialize scores for criteria that don't have scores yet
      const initialScoreMap: Record<string, RubricScore> = {};
      (data || []).forEach((criterion) => {
        initialScoreMap[criterion.id] = {
          criterion_id: criterion.id,
          criterion_name: criterion.criterion_name,
          points_earned: 0,
          max_points: criterion.max_points,
          feedback: '',
        };
      });
      setScores((prev) => ({ ...initialScoreMap, ...prev }));
    } catch (error) {
      console.error('Error fetching rubric criteria:', error);
      toast.error('Failed to load rubric');
    } finally {
      setLoading(false);
    }
  };

  const updateScore = (criterionId: string, pointsEarned: number, feedback?: string) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        points_earned: pointsEarned,
        ...(feedback !== undefined && { feedback }),
      },
    }));
  };

  const calculateTotalScore = () => {
    return Object.values(scores).reduce((sum, score) => sum + score.points_earned, 0);
  };

  const calculateMaxScore = () => {
    return criteria.reduce((sum, criterion) => sum + criterion.max_points, 0);
  };

  const handleSubmitGrade = () => {
    const totalScore = calculateTotalScore();
    const scoreArray = Object.values(scores);
    onGradeSubmit(scoreArray, totalScore, globalFeedback);
  };

  if (loading) {
    return <div className="p-6">Loading rubric...</div>;
  }

  const totalScore = calculateTotalScore();
  const maxScore = calculateMaxScore();
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overall Score Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">
                {totalScore} / {maxScore}
              </p>
              <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
            </div>
            <Badge
              variant={percentage >= 90 ? 'default' : percentage >= 80 ? 'secondary' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              {percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F'}
            </Badge>
          </div>
          <Progress value={percentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Rubric Criteria */}
      <Card>
        <CardHeader>
          <CardTitle>Grading Rubric</CardTitle>
          <p className="text-sm text-muted-foreground">Score each criterion below</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {criteria.map((criterion) => {
            const score = scores[criterion.id];
            if (!score) return null;

            const criterionPercentage = criterion.max_points > 0
              ? (score.points_earned / criterion.max_points) * 100
              : 0;

            return (
              <div key={criterion.id} className="space-y-3 pb-6 border-b last:border-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{criterion.criterion_name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {criterion.weight_percentage}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{criterion.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold">
                      {score.points_earned} / {criterion.max_points}
                    </p>
                  </div>
                </div>

                {/* Slider for points */}
                <div className="space-y-2">
                  <Label className="text-sm">Points Earned</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[score.points_earned]}
                      onValueChange={([value]) => updateScore(criterion.id, value)}
                      max={criterion.max_points}
                      step={0.5}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={score.points_earned}
                      onChange={(e) => updateScore(criterion.id, parseFloat(e.target.value) || 0)}
                      max={criterion.max_points}
                      min={0}
                      step={0.5}
                      className="w-20"
                    />
                  </div>
                  <Progress value={criterionPercentage} className="h-1" />
                </div>

                {/* Feedback for this criterion */}
                <div className="space-y-2">
                  <Label className="text-sm">Feedback (Optional)</Label>
                  <Textarea
                    value={score.feedback || ''}
                    onChange={(e) => updateScore(criterion.id, score.points_earned, e.target.value)}
                    placeholder="Add specific feedback for this criterion..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Overall Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={globalFeedback}
            onChange={(e) => setGlobalFeedback(e.target.value)}
            placeholder="Provide overall feedback on the submission..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button onClick={handleSubmitGrade} size="lg">
          <CheckCircle className="h-5 w-5 mr-2" />
          Submit Grade
        </Button>
      </div>
    </div>
  );
};
