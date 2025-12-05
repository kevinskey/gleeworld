import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save, CheckCircle } from 'lucide-react';

interface ManualGradingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: any;
  test: any;
  onGraded: () => void;
}

interface Answer {
  id: string;
  question_id: string;
  text_answer: string | null;
  selected_option_id: string | null;
  points_earned: number | null;
  is_correct: boolean | null;
  feedback: string | null;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  display_order: number;
}

export const ManualGradingDialog = ({
  open,
  onOpenChange,
  submission,
  test,
  onGraded
}: ManualGradingDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [grades, setGrades] = useState<Record<string, { points: number; feedback: string }>>({});

  useEffect(() => {
    if (open && submission) {
      loadAnswers();
    }
  }, [open, submission]);

  const loadAnswers = async () => {
    try {
      setLoading(true);

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', test.id)
        .order('display_order');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Load answers for this submission
      const { data: answersData, error: answersError } = await supabase
        .from('test_answers')
        .select('*')
        .eq('submission_id', submission.id);

      if (answersError) throw answersError;
      setAnswers(answersData || []);

      // Initialize grades from existing answers
      const initialGrades: Record<string, { points: number; feedback: string }> = {};
      (answersData || []).forEach(answer => {
        initialGrades[answer.question_id] = {
          points: answer.points_earned ?? 0,
          feedback: answer.feedback || ''
        };
      });
      setGrades(initialGrades);
    } catch (error) {
      console.error('Error loading answers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load submission answers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (questionId: string, field: 'points' | 'feedback', value: string | number) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value
      }
    }));
  };

  const saveGrades = async () => {
    try {
      setSaving(true);

      // Update each answer with grades
      for (const answer of answers) {
        const grade = grades[answer.question_id];
        if (grade) {
          const question = questions.find(q => q.id === answer.question_id);
          const { error } = await supabase
            .from('test_answers')
            .update({
              points_earned: grade.points,
              feedback: grade.feedback,
              is_correct: grade.points >= (question?.points || 0),
              graded_by: user?.id,
              graded_at: new Date().toISOString()
            })
            .eq('id', answer.id);

          if (error) throw error;
        }
      }

      // Calculate new total score
      const totalScore = Object.values(grades).reduce((sum, g) => sum + (g.points || 0), 0);
      
      // Update submission total score
      const { error: submissionError } = await supabase
        .from('test_submissions')
        .update({
          total_score: totalScore,
          passed: totalScore >= (test?.passing_score || 70)
        })
        .eq('id', submission.id);

      if (submissionError) throw submissionError;

      toast({
        title: 'Grades Saved',
        description: 'Manual grades have been saved successfully.'
      });

      onGraded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving grades:', error);
      toast({
        title: 'Error',
        description: 'Failed to save grades',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getAnswerForQuestion = (questionId: string) => {
    return answers.find(a => a.question_id === questionId);
  };

  // Filter to show only questions that need manual grading (short_answer, essay)
  const manualGradingQuestions = questions.filter(q => 
    q.question_type === 'short_answer' || q.question_type === 'essay'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Grade Submission: {submission?.gw_profiles?.full_name || 'Unknown'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : manualGradingQuestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No questions require manual grading
          </div>
        ) : (
          <div className="space-y-6">
            {manualGradingQuestions.map((question, index) => {
              const answer = getAnswerForQuestion(question.id);
              const grade = grades[question.id] || { points: 0, feedback: '' };

              return (
                <Card key={question.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="outline" className="mb-2">
                          {question.question_type === 'essay' ? 'Essay' : 'Short Answer'}
                        </Badge>
                        <h4 className="font-medium">
                          Question {question.display_order}: {question.question_text}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Max Points: {question.points}
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <Label className="text-sm font-medium mb-1 block">Student's Answer:</Label>
                      <p className="whitespace-pre-wrap">
                        {answer?.text_answer || <em className="text-muted-foreground">No answer provided</em>}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`points-${question.id}`}>Points Earned</Label>
                        <Input
                          id={`points-${question.id}`}
                          type="number"
                          min={0}
                          max={question.points}
                          value={grade.points}
                          onChange={(e) => handleGradeChange(question.id, 'points', parseInt(e.target.value) || 0)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Out of {question.points} points
                        </p>
                      </div>
                      <div>
                        <Label htmlFor={`feedback-${question.id}`}>Feedback</Label>
                        <Textarea
                          id={`feedback-${question.id}`}
                          placeholder="Optional feedback for student..."
                          value={grade.feedback}
                          onChange={(e) => handleGradeChange(question.id, 'feedback', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Manual Points: {Object.values(grades).reduce((sum, g) => sum + (g.points || 0), 0)}
                </p>
              </div>
              <Button onClick={saveGrades} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Grades
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
