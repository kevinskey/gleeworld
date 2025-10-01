import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [submissionAnimation, setSubmissionAnimation] = useState(false);
  const [anonId, setAnonId] = useState<string | null>(null);

  // Ensure we have a persistent anonymous UUID for non-authenticated students
  useEffect(() => {
    if (!user) {
      let existing = localStorage.getItem('gw_anon_student_uuid');
      if (!existing) {
        try {
          existing = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-anon`;
          localStorage.setItem('gw_anon_student_uuid', existing);
        } catch (e) {
          // Fallback if crypto not available
          existing = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-anon`;
          localStorage.setItem('gw_anon_student_uuid', existing);
        }
      }
      setAnonId(existing);
    }
  }, [user]);

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
            setJustSubmitted(false);
            setSubmissionAnimation(false);
            checkExistingResponse(payload.new.id, payload.new.current_question_index);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pollChannel);
    };
  }, []); // Remove dependency on activePoll?.current_question_index

  useEffect(() => {
    if (activePoll) {
      checkExistingResponse(activePoll.id, activePoll.current_question_index);
      fetchResponses();
      
      // Subscribe to response updates for live results
      const responseChannel = supabase
        .channel(`poll-responses-live-${activePoll.id}-${activePoll.current_question_index}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mus240_poll_responses',
            filter: `poll_id=eq.${activePoll.id},question_index=eq.${activePoll.current_question_index}`
          },
          (payload) => {
            console.log('Response update:', payload);
            fetchResponses(); // Refetch to get updated counts
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(responseChannel);
      };
    }
  }, [activePoll?.id, activePoll?.current_question_index]);

  const fetchActivePoll = async () => {
    console.log('🔍 Fetching active poll...');
    try {
      const { data, error } = await supabase
        .from('mus240_polls')
        .select('*')
        .eq('is_active', true)
        .eq('is_live_session', true)
        .maybeSingle();

      console.log('📊 Active poll query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const poll = {
          ...data,
          questions: Array.isArray(data.questions) ? data.questions : JSON.parse(typeof data.questions === 'string' ? data.questions : '[]')
        } as Poll;
        console.log('✅ Active poll set:', poll);
        setActivePoll(poll);
      } else {
        console.log('ℹ️ No active poll found');
        setActivePoll(null);
      }
    } catch (error) {
      console.error('Error fetching active poll:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingResponse = async (pollId: string, questionIndex: number) => {
    // RLS policy requires student_id to match auth.uid()::text, so only check for authenticated users
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('mus240_poll_responses')
        .select('selected_option')
        .eq('poll_id', pollId)
        .eq('student_id', user.id)
        .eq('question_index', questionIndex)
        .maybeSingle();

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
    console.log('🎯 submitResponse called', { 
      activePoll: !!activePoll, 
      submitting, 
      selectedAnswer, 
      user: !!user, 
      userId: user?.id,
      anonId,
      pollId: activePoll?.id,
      currentQuestionIndex: activePoll?.current_question_index
    });
    
    if (!activePoll || submitting) {
      console.log('❌ Early return:', { activePoll: !!activePoll, submitting });
      return;
    }

    // 🔒 Require authentication to satisfy RLS policies
    if (!user?.id) {
      console.warn('🔒 Submission blocked: user not authenticated');
      toast.error('Please sign in to submit your response.');
      setSubmissionAnimation(false);
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    setSubmissionAnimation(true);
    
    // RLS policy requires student_id to match auth.uid()::text, so use the authenticated user ID
    const studentId = user.id; // Already verified user.id exists above
    console.log('🔑 Student ID resolution:', { userId: user.id, studentId });
    
    const requestData = {
      poll_id: activePoll.id,
      student_id: studentId,
      question_index: activePoll.current_question_index,
      selected_option: selectedAnswer,
      response_time: new Date().toISOString()
    };
    
    console.log('📤 Submitting poll response:', requestData);
    console.log('📤 Supabase client check:', !!supabase);
    
    try {
      console.log('🔄 Starting upsert operation...');
      const { data, error } = await supabase
        .from('mus240_poll_responses')
        .upsert([requestData], {
          onConflict: 'poll_id,question_index,student_id',
        });

      console.log('📥 Supabase response:', { data, error });
      console.log('📥 Response data type:', typeof data);
      console.log('📥 Error type:', typeof error);
      
      if (error) {
        console.error('❌ Supabase error details:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Error details:', error.details);
        throw error;
      }

      console.log('✅ Poll response submitted successfully');
      
      setUserResponse(selectedAnswer);
      setHasSubmitted(true);
      setJustSubmitted(true);
      
      // Success animation sequence
      setTimeout(() => setSubmissionAnimation(false), 1000);
      setTimeout(() => setJustSubmitted(false), 3000);
      
      toast.success('🎵 Response submitted successfully!', {
        description: 'Your answer has been recorded and counts toward participation.',
        duration: 4000,
      });
    } catch (error) {
      console.error('❌ Error submitting response:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      const err: any = error as any;
      const msg = err?.message || err?.hint || err?.details || 'Please try again';
      toast.error(`Failed to submit response: ${msg}`);
      setSubmissionAnimation(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Loading live poll...</p>
        </div>
      </div>
    );
  }

  if (!activePoll) {
    return (
      <div className="h-full flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl">
        <div className="text-center p-6">
          <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Live Poll Active</h3>
          <p className="text-gray-600 text-sm">
            Wait for your instructor to start a live polling session.
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = activePoll.questions[activePoll.current_question_index];
  const totalResponses = responses.length;
  const isLastQuestion = activePoll.current_question_index === activePoll.questions.length - 1;
  const pollCompleted = isLastQuestion && hasSubmitted && activePoll.show_results;

  // Calculate response percentages for results display
  const responseStats = currentQuestion?.options.map((option, index) => {
    const count = responses.filter(r => r.selected_option === index).length;
    const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
    return { option, count, percentage, isCorrect: index === currentQuestion.correct_answer };
  }) || [];

  // Poll completion state
  if (pollCompleted) {
    return (
      <div className="h-full flex flex-col bg-white/95 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl overflow-hidden">
        {/* Compact Completion Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-center text-white">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-2xl font-bold mb-1">Poll Complete!</h2>
          <p className="text-sm text-emerald-100">Thank you for participating</p>
        </div>

        {/* Stats Grid - Fixed */}
        <div className="flex-shrink-0 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-200">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/80 rounded-lg p-2 text-center border border-emerald-200">
              <div className="text-xl font-bold text-gray-800">{activePoll.questions.length}</div>
              <div className="text-xs text-gray-600">Questions</div>
            </div>
            <div className="bg-white/80 rounded-lg p-2 text-center border border-emerald-200">
              <div className="text-xl font-bold text-gray-800">100%</div>
              <div className="text-xs text-gray-600">Participation</div>
            </div>
            <div className="bg-white/80 rounded-lg p-2 text-center border border-emerald-200">
              <div className="text-xl font-bold text-emerald-600">✓</div>
              <div className="text-xs text-gray-600">Complete</div>
            </div>
          </div>
        </div>

        {/* Scrollable Results */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {activePoll.questions.map((question, questionIndex) => {
              const questionResponses = responses.filter(r => r.question_index === questionIndex);
              const questionStats = question.options.map((option, optionIndex) => {
                const count = questionResponses.filter(r => r.selected_option === optionIndex).length;
                const percentage = questionResponses.length > 0 ? (count / questionResponses.length) * 100 : 0;
                return { option, count, percentage, isCorrect: optionIndex === question.correct_answer };
              });

              return (
                <div key={questionIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                    {questionIndex + 1}. {question.question}
                  </h4>
                  <div className="space-y-2">
                    {questionStats.map((stat, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`p-2 rounded-lg border-2 ${
                          stat.isCorrect
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs">
                            <span className="font-medium mr-1">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>
                            {stat.option}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {stat.isCorrect && (
                              <Badge className="bg-green-600 text-white text-xs px-1.5 py-0">✓</Badge>
                            )}
                            <span className="text-xs text-gray-600">
                              {stat.percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <Progress value={stat.percentage} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                  
                  {question.explanation && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="text-xs font-medium text-blue-900 mb-1">💡 Explanation</h5>
                      <p className="text-xs text-blue-800">{question.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white/95 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl overflow-hidden">
      {/* Compact Header - Fixed */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-500 border-b border-slate-400/20">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">{activePoll.title}</span>
            <Badge className="bg-rose-500 text-white animate-pulse border-0 text-xs">
              <div className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-bounce"></div>
              LIVE
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Q {activePoll.current_question_index + 1}/{activePoll.questions.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{totalResponses}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Stats Bar - Compact */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 text-center border border-blue-100">
              <div className="text-2xl font-light text-gray-800">{totalResponses}</div>
              <div className="text-xs text-gray-600">Responses</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 text-center border border-purple-100">
              <div className="text-2xl font-light text-gray-800">{activePoll.current_question_index + 1}/{activePoll.questions.length}</div>
              <div className="text-xs text-gray-600">Progress</div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 text-center border border-amber-100">
              <div className="text-2xl font-light text-gray-800">{totalResponses > 0 ? Math.round((totalResponses / 30) * 100) : 0}%</div>
              <div className="text-xs text-gray-600">Class Rate</div>
            </div>
          </div>

          {/* Question */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl p-4 border border-slate-400/20">
            <h3 className="text-lg font-semibold text-white leading-snug">
              {currentQuestion.question}
            </h3>
            {currentQuestion.audio_url && (
              <div className="flex items-center gap-2 text-amber-300 text-sm mt-2">
                <span>🎵</span>
                <span>{currentQuestion.audio_url}</span>
              </div>
            )}
          </div>

          {!activePoll.show_results ? (
            // Answer Selection Mode
            <div className="space-y-2">
              {/* Submission Status */}
              {justSubmitted && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 rounded-xl mb-2 animate-pulse">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="text-xl">✅</div>
                    <div>
                      <div className="font-bold">Submitted!</div>
                      <div className="text-xs text-emerald-100">Response recorded</div>
                    </div>
                  </div>
                </div>
              )}
              
              {hasSubmitted && !justSubmitted && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 mb-2 text-sm">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Response Recorded</div>
                    <div className="text-xs">Waiting for results...</div>
                  </div>
                </div>
              )}
              
              {/* Options */}
              {currentQuestion.options.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => submitResponse(index)}
                  disabled={hasSubmitted || submitting}
                  className={`w-full text-left justify-start p-4 h-auto transition-all relative ${
                    submitting && userResponse !== index
                      ? 'opacity-50'
                      : userResponse === index && submissionAnimation
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg animate-pulse'
                      : userResponse === index
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : hasSubmitted
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'
                      : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center w-full gap-3">
                    <span className="font-bold text-base flex-shrink-0">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="flex-1 text-sm">{option}</span>
                    {userResponse === index && hasSubmitted && (
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    {submitting && userResponse === index && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white flex-shrink-0"></div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            // Results Display Mode
            <div className="space-y-3">
              {/* Results Grid */}
              <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-4 rounded-xl border border-slate-400/20">
                <div className="text-center mb-3">
                  <div className="text-2xl text-white font-light">📊 Live Results</div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {responseStats.map((stat, index) => (
                    <div key={index} className="bg-white/95 rounded-lg p-3 text-center border border-gray-200">
                      <div className="text-3xl font-light text-gray-800">{stat.count}</div>
                      <div className="text-base font-medium text-gray-700">{String.fromCharCode(65 + index)}</div>
                      <div className="text-sm text-gray-600">{stat.percentage.toFixed(0)}%</div>
                      {stat.isCorrect && <div className="text-lg mt-1">🌟</div>}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-white/80 text-center">
                  {totalResponses} responses ✨
                </div>
              </div>
              
              {/* Detailed Results */}
              {responseStats.map((stat, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-2 ${
                    stat.isCorrect
                      ? 'border-green-300 bg-green-50'
                      : userResponse === index && !stat.isCorrect
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-900">
                      {String.fromCharCode(65 + index)}. {stat.option}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stat.isCorrect && (
                        <Badge className="bg-green-600 text-white text-xs">✓</Badge>
                      )}
                      {userResponse === index && (
                        <Badge className="bg-blue-600 text-white text-xs">You</Badge>
                      )}
                      <span className="text-xs font-medium text-gray-600 bg-white px-1.5 py-0.5 rounded">
                        {stat.count}
                      </span>
                    </div>
                  </div>
                  <Progress value={stat.percentage} className="h-2" />
                </div>
              ))}
              
              {currentQuestion.explanation && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">💡 Explanation</h4>
                  <p className="text-xs text-blue-800">{currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};