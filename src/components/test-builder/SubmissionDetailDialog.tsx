import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SubmissionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: any;
  test: any;
}

export const SubmissionDetailDialog = ({
  open,
  onOpenChange,
  submission,
  test
}: SubmissionDetailDialogProps) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && submission?.id) {
      loadSubmissionDetails();
    }
  }, [open, submission?.id]);

  const loadSubmissionDetails = async () => {
    if (!submission?.id) return;
    
    try {
      setLoading(true);

      // Load questions with options
      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select(`
          *,
          test_answer_options (*)
        `)
        .eq('test_id', test.id)
        .order('order_index');

      if (questionsError) throw questionsError;

      // Load answers for this submission
      const { data: answersData, error: answersError } = await supabase
        .from('test_answers')
        .select('*')
        .eq('submission_id', submission.id);

      if (answersError) throw answersError;

      setQuestions(questionsData || []);
      setAnswers(answersData || []);
    } catch (error) {
      console.error('Error loading submission details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAnswerForQuestion = (questionId: string) => {
    return answers.find(a => a.question_id === questionId);
  };

  const getSelectedOptions = (questionId: string, options: any[]) => {
    const answer = getAnswerForQuestion(questionId);
    if (!answer?.selected_option_ids) return [];
    return options.filter(o => answer.selected_option_ids.includes(o.id));
  };

  const getCorrectOptions = (options: any[]) => {
    return options.filter(o => o.is_correct);
  };

  const renderQuestionResult = (question: any) => {
    const answer = getAnswerForQuestion(question.id);
    const options = question.test_answer_options || [];
    
    if (question.question_type === 'multiple_choice') {
      const selectedOptions = getSelectedOptions(question.id, options);
      const correctOptions = getCorrectOptions(options);
      
      return (
        <div className="space-y-2">
          {options.map((option: any) => {
            const isSelected = selectedOptions.some(s => s.id === option.id);
            const isCorrect = option.is_correct;
            
            return (
              <div
                key={option.id}
                className={`p-2 rounded border ${
                  isSelected && isCorrect
                    ? 'bg-green-500/10 border-green-500'
                    : isSelected && !isCorrect
                    ? 'bg-red-500/10 border-red-500'
                    : !isSelected && isCorrect
                    ? 'bg-green-500/5 border-green-500/50 border-dashed'
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isSelected && isCorrect && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-500" />}
                  {!isSelected && isCorrect && <CheckCircle className="h-4 w-4 text-green-500/50" />}
                  <span className={isSelected ? 'font-medium' : ''}>{option.option_text}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (question.question_type === 'true_false') {
      const selectedAnswer = answer?.text_answer;
      const correctAnswer = options.find(o => o.is_correct)?.option_text?.toLowerCase();
      const isCorrect = selectedAnswer?.toLowerCase() === correctAnswer;

      return (
        <div className="space-y-2">
          {['true', 'false'].map((value) => {
            const isSelected = selectedAnswer?.toLowerCase() === value;
            const isCorrectOption = correctAnswer === value;
            
            return (
              <div
                key={value}
                className={`p-2 rounded border ${
                  isSelected && isCorrectOption
                    ? 'bg-green-500/10 border-green-500'
                    : isSelected && !isCorrectOption
                    ? 'bg-red-500/10 border-red-500'
                    : !isSelected && isCorrectOption
                    ? 'bg-green-500/5 border-green-500/50 border-dashed'
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isSelected && isCorrectOption && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {isSelected && !isCorrectOption && <XCircle className="h-4 w-4 text-red-500" />}
                  {!isSelected && isCorrectOption && <CheckCircle className="h-4 w-4 text-green-500/50" />}
                  <span className={`capitalize ${isSelected ? 'font-medium' : ''}`}>{value}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Short answer or essay
    return (
      <div className="space-y-2">
        <div className="p-3 bg-muted/30 rounded border">
          <p className="text-sm font-medium text-muted-foreground mb-1">Student's Answer:</p>
          <p className="whitespace-pre-wrap">{answer?.text_answer || <em className="text-muted-foreground">No answer provided</em>}</p>
        </div>
        {question.correct_answer && (
          <div className="p-3 bg-green-500/5 rounded border border-green-500/30">
            <p className="text-sm font-medium text-green-600 mb-1">Expected Answer:</p>
            <p className="whitespace-pre-wrap">{question.correct_answer}</p>
          </div>
        )}
      </div>
    );
  };

  if (!submission) return null;

  const percentage = ((submission.total_score / (test?.total_points || 100)) * 100).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Submission Details</span>
            <div className="flex items-center gap-2">
              <Badge variant={submission.passed ? 'default' : 'destructive'}>
                {submission.passed ? 'Passed' : 'Failed'}
              </Badge>
              <Badge variant="outline">
                {submission.total_score}/{test?.total_points} ({percentage}%)
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
          <p className="font-medium">{submission.gw_profiles?.full_name || 'Unknown Student'}</p>
          <p className="text-sm text-muted-foreground">{submission.gw_profiles?.email}</p>
          <p className="text-sm text-muted-foreground">
            Submitted: {new Date(submission.created_at).toLocaleString()}
          </p>
        </div>

        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading submission...</div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const answer = getAnswerForQuestion(question.id);
                const pointsEarned = answer?.points_earned ?? 0;
                
                return (
                  <Card key={question.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-start justify-between gap-2">
                        <span>
                          <span className="text-muted-foreground">Q{index + 1}.</span>{' '}
                          {question.question_text}
                        </span>
                        <Badge 
                          variant={pointsEarned === question.points ? 'default' : pointsEarned > 0 ? 'secondary' : 'destructive'}
                          className="shrink-0"
                        >
                          {pointsEarned}/{question.points} pts
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {question.question_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {renderQuestionResult(question)}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
