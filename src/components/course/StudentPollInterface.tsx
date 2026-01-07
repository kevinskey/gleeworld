import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { BarChart3, CheckCircle2, Clock, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PollQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  questions: PollQuestion[];
  is_active: boolean;
}

interface PollResponse {
  poll_id: string;
  question_index: number;
  selected_option: number;
}

interface StudentPollInterfaceProps {
  courseId: string;
}

export const StudentPollInterface: React.FC<StudentPollInterfaceProps> = ({ courseId }) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [responses, setResponses] = useState<PollResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPolls();
    fetchResponses();
  }, [courseId, user?.id]);

  const fetchPolls = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_academy_polls')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsedPolls = (data || []).map(poll => ({
        ...poll,
        questions: Array.isArray(poll.questions) ? (poll.questions as unknown as PollQuestion[]) : []
      })).filter(poll => poll.questions.length > 0);
      
      setPolls(parsedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('gw_academy_poll_responses')
        .select('poll_id, question_index, selected_option')
        .eq('student_id', user.id);

      if (error) throw error;
      setResponses((data || []) as PollResponse[]);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const startPoll = (poll: Poll) => {
    // Find first unanswered question
    const answeredQuestions = responses
      .filter(r => r.poll_id === poll.id)
      .map(r => r.question_index);
    
    const firstUnanswered = poll.questions.findIndex((_, idx) => !answeredQuestions.includes(idx));
    
    setActivePoll(poll);
    setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
    setSelectedOption(null);
    setShowResult(false);
  };

  const submitAnswer = async () => {
    if (!activePoll || selectedOption === null || !user) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('gw_academy_poll_responses')
        .insert({
          poll_id: activePoll.id,
          student_id: user.id,
          question_index: currentQuestionIndex,
          selected_option: selectedOption
        });

      if (error) throw error;

      setResponses(prev => [...prev, {
        poll_id: activePoll.id,
        question_index: currentQuestionIndex,
        selected_option: selectedOption
      }]);

      setShowResult(true);
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (!activePoll) return;
    
    if (currentQuestionIndex < activePoll.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      // Poll complete
      setActivePoll(null);
      toast.success('Poll completed!');
    }
  };

  const getPollProgress = (poll: Poll) => {
    const answered = responses.filter(r => r.poll_id === poll.id).length;
    return {
      answered,
      total: poll.questions.length,
      percentage: (answered / poll.questions.length) * 100,
      isComplete: answered >= poll.questions.length
    };
  };

  const getPollScore = (poll: Poll) => {
    const pollResponses = responses.filter(r => r.poll_id === poll.id);
    // Calculate correctness by comparing selected_option with poll question's correct_answer
    const correct = pollResponses.filter(r => {
      const question = poll.questions[r.question_index];
      return question && r.selected_option === question.correct_answer;
    }).length;
    return { correct, total: pollResponses.length };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Active poll view
  if (activePoll) {
    const question = activePoll.questions[currentQuestionIndex];
    const existingResponse = responses.find(
      r => r.poll_id === activePoll.id && r.question_index === currentQuestionIndex
    );

    if (existingResponse) {
      // Already answered this question
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{activePoll.title}</CardTitle>
              <Badge variant="secondary">
                Question {currentQuestionIndex + 1} of {activePoll.questions.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-medium">{question.question}</p>
            
            <div className="space-y-2">
              {question.options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    idx === question.correct_answer
                      ? 'bg-green-50 border-green-300 dark:bg-green-900/20'
                      : idx === existingResponse.selected_option
                      ? 'bg-red-50 border-red-300 dark:bg-red-900/20'
                      : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {idx === question.correct_answer && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {idx === existingResponse.selected_option && idx !== question.correct_answer && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{opt}</span>
                  </div>
                </div>
              ))}
            </div>

            {question.explanation && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                <p className="text-sm"><strong>Explanation:</strong> {question.explanation}</p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setActivePoll(null)}>
                Exit Poll
              </Button>
              <Button onClick={nextQuestion}>
                {currentQuestionIndex < activePoll.questions.length - 1 ? (
                  <>Next Question <ChevronRight className="h-4 w-4 ml-1" /></>
                ) : (
                  'Finish Poll'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{activePoll.title}</CardTitle>
            <Badge variant="secondary">
              Question {currentQuestionIndex + 1} of {activePoll.questions.length}
            </Badge>
          </div>
          <Progress value={((currentQuestionIndex) / activePoll.questions.length) * 100} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg font-medium">{question.question}</p>
          
          {!showResult ? (
            <>
              <RadioGroup
                value={selectedOption?.toString()}
                onValueChange={(val) => setSelectedOption(parseInt(val))}
              >
                {question.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                    <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActivePoll(null)}>
                  Exit Poll
                </Button>
                <Button 
                  onClick={submitAnswer} 
                  disabled={selectedOption === null || submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Answer'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                {question.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      idx === question.correct_answer
                        ? 'bg-green-50 border-green-300 dark:bg-green-900/20'
                        : idx === selectedOption
                        ? 'bg-red-50 border-red-300 dark:bg-red-900/20'
                        : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {idx === question.correct_answer && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {idx === selectedOption && idx !== question.correct_answer && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>{opt}</span>
                    </div>
                  </div>
                ))}
              </div>

              {selectedOption === question.correct_answer ? (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                  <p className="text-green-700 dark:text-green-300 font-medium">✓ Correct!</p>
                </div>
              ) : (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
                  <p className="text-red-700 dark:text-red-300 font-medium">✗ Incorrect</p>
                </div>
              )}

              {question.explanation && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                  <p className="text-sm"><strong>Explanation:</strong> {question.explanation}</p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={nextQuestion}>
                  {currentQuestionIndex < activePoll.questions.length - 1 ? (
                    <>Next Question <ChevronRight className="h-4 w-4 ml-1" /></>
                  ) : (
                    'Finish Poll'
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Polls list view
  if (polls.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Polls</h3>
          <p className="text-muted-foreground">
            There are no polls available for this course right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Course Polls
        </h2>
        <Button variant="outline" size="sm" onClick={fetchPolls}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {polls.map((poll) => {
        const progress = getPollProgress(poll);
        const score = getPollScore(poll);

        return (
          <Card key={poll.id} className={progress.isComplete ? 'opacity-75' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{poll.title}</CardTitle>
                {progress.isComplete ? (
                  <Badge variant="secondary">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                ) : progress.answered > 0 ? (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    In Progress
                  </Badge>
                ) : (
                  <Badge>New</Badge>
                )}
              </div>
              {poll.description && (
                <p className="text-sm text-muted-foreground">{poll.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {progress.answered} of {progress.total} questions answered
                </span>
                {progress.isComplete && (
                  <span className="font-medium">
                    Score: {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
                  </span>
                )}
              </div>
              <Progress value={progress.percentage} className="h-2" />
              
              <Button 
                onClick={() => startPoll(poll)}
                className="w-full"
                variant={progress.isComplete ? "outline" : "default"}
              >
                {progress.isComplete ? 'Review Answers' : progress.answered > 0 ? 'Continue Poll' : 'Start Poll'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
