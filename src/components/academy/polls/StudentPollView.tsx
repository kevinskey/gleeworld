import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, BarChart3, Radio } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AcademyPoll, PollQuestion } from './AcademyPollSystem';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';

interface StudentPollViewProps {
  poll: AcademyPoll;
  onResponseSubmitted?: () => void;
}

interface PollResponse {
  question_index: number;
  selected_option: number;
}

export const StudentPollView: React.FC<StudentPollViewProps> = ({ poll, onResponseSubmitted }) => {
  const { user } = useAuth();
  const { currentSemester } = useMus240SemesterSafe();
  const [responses, setResponses] = useState<PollResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Fetch existing responses
  useEffect(() => {
    if (user?.id) {
      fetchExistingResponses();
    }
  }, [poll.id, user?.id]);

  // Real-time subscription for live sessions
  useEffect(() => {
    if (poll.is_live_session) {
      const channel = supabase
        .channel(`poll-${poll.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'gw_academy_polls',
            filter: `id=eq.${poll.id}`
          },
          (payload) => {
            const newData = payload.new as any;
            if (newData.current_question_index !== undefined) {
              setCurrentQuestionIndex(newData.current_question_index);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [poll.id, poll.is_live_session]);

  const fetchExistingResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_academy_poll_responses')
        .select('question_index, selected_option')
        .eq('poll_id', poll.id)
        .eq('student_id', user?.id);

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const submitAnswer = async (questionIndex: number, selectedOption: number) => {
    if (!user?.id) {
      toast.error('Please sign in to submit your response');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('gw_academy_poll_responses')
        .upsert({
          poll_id: poll.id,
          student_id: user.id,
          question_index: questionIndex,
          selected_option: selectedOption,
          semester: currentSemester,
          response_time: new Date().toISOString()
        }, {
          onConflict: 'poll_id,student_id,question_index'
        });

      if (error) throw error;

      setResponses(prev => {
        const existing = prev.find(r => r.question_index === questionIndex);
        if (existing) {
          return prev.map(r => 
            r.question_index === questionIndex 
              ? { ...r, selected_option: selectedOption }
              : r
          );
        }
        return [...prev, { question_index: questionIndex, selected_option: selectedOption }];
      });

      toast.success('Response submitted!');
      onResponseSubmitted?.();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const getResponseForQuestion = (questionIndex: number) => {
    return responses.find(r => r.question_index === questionIndex);
  };

  const answeredCount = responses.length;
  const totalQuestions = poll.questions.length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  // For live sessions, only show current question
  const questionsToShow = poll.is_live_session 
    ? [poll.questions[currentQuestionIndex]].filter(Boolean)
    : poll.questions;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {poll.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {poll.is_live_session && (
              <Badge variant="secondary" className="animate-pulse">
                <Radio className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
            <Badge variant="outline">
              {answeredCount}/{totalQuestions} answered
            </Badge>
          </div>
        </div>
        {poll.description && (
          <p className="text-sm text-muted-foreground">{poll.description}</p>
        )}
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {questionsToShow.map((question, displayIdx) => {
          const questionIndex = poll.is_live_session ? currentQuestionIndex : displayIdx;
          const response = getResponseForQuestion(questionIndex);
          
          return (
            <div key={questionIndex} className="space-y-3">
              <div className="flex items-start gap-2">
                {response ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium">
                    {poll.is_live_session ? '' : `${questionIndex + 1}. `}
                    {question.question}
                  </p>
                </div>
              </div>
              
              <div className="grid gap-2 ml-7">
                {question.options.map((option, optionIdx) => (
                  <Button
                    key={optionIdx}
                    variant={response?.selected_option === optionIdx ? "default" : "outline"}
                    className="justify-start h-auto py-3 px-4 text-left"
                    onClick={() => submitAnswer(questionIndex, optionIdx)}
                    disabled={submitting}
                  >
                    <span className="font-medium mr-2">
                      {String.fromCharCode(65 + optionIdx)}.
                    </span>
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}

        {poll.questions.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            This poll has no questions yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
