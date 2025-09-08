import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Question {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  audio_url?: string;
}

interface Poll {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  current_question_index: number;
  is_live_session: boolean;
  show_results: boolean;
}

interface Response {
  id: string;
  poll_id: string;
  question_index: number;
  selected_option: number;
  student_id: string;
  response_time: string;
}

export const LiveStudentInterface: React.FC = () => {
  const { user } = useAuth();
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [userResponse, setUserResponse] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchActivePoll();
    
    // Subscribe to poll updates
    const pollChannel = supabase
      .channel('live-polls')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mus240_polls',
          filter: 'is_live_session=eq.true'
        },
        (payload) => {
          console.log('Poll updated:', payload);
          const newPoll = {
            ...payload.new,
            questions: Array.isArray(payload.new.questions) ? payload.new.questions : JSON.parse(payload.new.questions || '[]')
          } as Poll;
          setActivePoll(newPoll);
          
          // Reset response state when question changes
          if (payload.new.current_question_index !== activePoll?.current_question_index) {
            setUserResponse(null);
            setHasSubmitted(false);
            checkExistingResponse(payload.new.id, payload.new.current_question_index);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pollChannel);
    };
  }, []);

  useEffect(() => {
    if (activePoll) {
      checkExistingResponse(activePoll.id, activePoll.current_question_index);
      fetchResponses();
      
      // Subscribe to response updates for live results
      const responseChannel = supabase
        .channel('poll-responses-live')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mus240_poll_responses',
            filter: `poll_id=eq.${activePoll.id},question_index=eq.${activePoll.current_question_index}`
          },
          () => fetchResponses()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(responseChannel);
      };
    }
  }, [activePoll?.id, activePoll?.current_question_index]);

  const fetchActivePoll = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_polls')
        .select('*')
        .eq('is_active', true)
        .eq('is_live_session', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const poll = {
          ...data,
          questions: Array.isArray(data.questions) ? data.questions : JSON.parse(typeof data.questions === 'string' ? data.questions : '[]')
        } as Poll;
        setActivePoll(poll);
      }
    } catch (error) {
      console.error('Error fetching active poll:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingResponse = async (pollId: string, questionIndex: number) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('mus240_poll_responses')
        .select('selected_option')
        .eq('poll_id', pollId)
        .eq('student_id', user?.id ?? '')
        .eq('question_index', questionIndex)
        .single();

      if (data) {
        setUserResponse(data.selected_option);
        setHasSubmitted(true);
      }
    } catch (error) {
      // No existing response found, which is fine
      console.log('No existing response found');
    }
  };

  const fetchResponses = async () => {
    if (!activePoll) return;

    try {
      const { data, error } = await supabase
        .from('mus240_poll_responses')
        .select('*')
        .eq('poll_id', activePoll.id)
        .eq('question_index', activePoll.current_question_index);

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const submitResponse = async (selectedAnswer: number) => {
    if (!user || !activePoll || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('mus240_poll_responses')
        .upsert({
          poll_id: activePoll.id,
          student_id: user?.id ?? '',
          question_index: activePoll.current_question_index,
          selected_option: selectedAnswer,
          response_time: new Date().toISOString()
        });

      if (error) throw error;

      setUserResponse(selectedAnswer);
      setHasSubmitted(true);
      toast.success('Response submitted!');
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm border border-white/30 shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading live poll...</p>
        </CardContent>
      </Card>
    );
  }

  if (!activePoll) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm border border-white/30 shadow-xl">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Live Poll Active</h3>
          <p className="text-gray-600">
            Wait for your instructor to start a live polling session.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = activePoll.questions[activePoll.current_question_index];
  const totalResponses = responses.length;

  // Calculate response percentages for results display
  const responseStats = currentQuestion?.options.map((option, index) => {
    const count = responses.filter(r => r.selected_option === index).length;
    const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
    return { option, count, percentage, isCorrect: index === currentQuestion.correct_answer };
  }) || [];

  return (
    <div className="space-y-6">
      {/* Poll Header */}
      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-gray-900">{activePoll.title}</CardTitle>
              <p className="text-gray-600 mt-1">{activePoll.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-red-600 text-white animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                LIVE
              </Badge>
              <div className="text-right text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Question {activePoll.current_question_index + 1} of {activePoll.questions.length}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-4 w-4" />
                  {totalResponses} responses
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Question */}
      <Card className="bg-white/95 backdrop-blur-sm border border-white/30 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900">
            {currentQuestion.question}
          </CardTitle>
          {currentQuestion.audio_url && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <span>🎵</span>
              <span>Audio clip: {currentQuestion.audio_url}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!activePoll.show_results ? (
            // Answer Selection Mode
            <div className="space-y-3">
              {hasSubmitted && (
                <div className="flex items-center gap-2 text-green-600 font-medium mb-4">
                  <CheckCircle className="h-5 w-5" />
                  Response submitted! Waiting for results...
                </div>
              )}
              
              {currentQuestion.options.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => submitResponse(index)}
                  disabled={hasSubmitted || submitting}
                  className={`w-full text-left justify-start p-4 h-auto transition-all duration-200 ${
                    userResponse === index
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                      : hasSubmitted
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-orange-50 text-gray-900 border border-gray-200 hover:border-orange-300 shadow-sm'
                  }`}
                >
                  <span className="font-medium mr-3">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </Button>
              ))}
            </div>
          ) : (
            // Results Display Mode
            <div className="space-y-4">
              <div className="text-center text-lg font-semibold text-gray-800 mb-6">
                Live Results
              </div>
              
              {responseStats.map((stat, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    stat.isCorrect
                      ? 'border-green-300 bg-green-50'
                      : userResponse === index && !stat.isCorrect
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {String.fromCharCode(65 + index)}. {stat.option}
                    </span>
                    <div className="flex items-center gap-2">
                      {stat.isCorrect && (
                        <Badge className="bg-green-600 text-white">Correct</Badge>
                      )}
                      {userResponse === index && (
                        <Badge className="bg-blue-600 text-white">Your Answer</Badge>
                      )}
                      <span className="text-sm font-medium text-gray-600">
                        {stat.count} ({stat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress value={stat.percentage} className="h-2" />
                </div>
              ))}
              
              {currentQuestion.explanation && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <h4 className="font-semibold text-blue-900 mb-2">Explanation:</h4>
                  <p className="text-blue-800">{currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};