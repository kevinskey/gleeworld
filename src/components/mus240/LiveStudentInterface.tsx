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
    
    // Subscribe to poll updates with better event handling
    const pollChannel = supabase
      .channel('live-polls-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mus240_polls',
          filter: 'is_live_session=eq.true'
        },
        (payload) => {
          console.log('🔔 Poll updated via realtime:', payload);
          const newPoll = {
            ...payload.new,
            questions: Array.isArray(payload.new.questions) ? payload.new.questions : JSON.parse(payload.new.questions || '[]')
          } as Poll;
          
          console.log('📊 New poll state:', {
            oldQuestionIndex: activePoll?.current_question_index,
            newQuestionIndex: newPoll.current_question_index,
            isLive: newPoll.is_live_session,
            showResults: newPoll.show_results
          });
          
          setActivePoll(prev => {
            // Check if question changed
            const questionChanged = prev && prev.current_question_index !== newPoll.current_question_index;
            
            if (questionChanged) {
              console.log('🔄 Question changed, resetting state');
              setUserResponse(null);
              setHasSubmitted(false);
              setJustSubmitted(false);
              setSubmissionAnimation(false);
              
              // Check if user already answered this question
              if (user?.id) {
                checkExistingResponse(newPoll.id, newPoll.current_question_index);
              }
            }
            
            return newPoll;
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up realtime subscription');
      supabase.removeChannel(pollChannel);
    };
  }, [user?.id]); // Only depend on user.id

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
    <div className="h-full flex flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl border border-orange-200 shadow-2xl overflow-hidden">
      {/* Dynamic Header with Progress */}
      <div className="flex-shrink-0 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-pulse"></div>
        
        <div className="relative px-4 py-4">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl animate-bounce">🎵</div>
              <div>
                <h2 className="text-xl font-bold text-white">{activePoll.title}</h2>
                <p className="text-xs text-orange-100">Music Theory Live Poll</p>
              </div>
            </div>
            <Badge className="bg-rose-500 text-white animate-pulse border-0 shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full mr-2 animate-ping"></div>
              LIVE NOW
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-white text-sm">
              <span className="font-medium">Question {activePoll.current_question_index + 1} of {activePoll.questions.length}</span>
              <span className="text-orange-100">{Math.round(((activePoll.current_question_index + 1) / activePoll.questions.length) * 100)}% Complete</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${((activePoll.current_question_index + 1) / activePoll.questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Live Stats */}
          <div className="flex items-center justify-between mt-3 text-white text-sm">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Users className="h-4 w-4" />
              <span className="font-semibold">{totalResponses}</span>
              <span className="text-orange-100">answered</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Clock className="h-4 w-4" />
              <span className="text-orange-100">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {!activePoll.show_results ? (
            // ========== ANSWER MODE ==========
            <>
              {/* Question Card */}
              <div className="relative">
                <div className="absolute -top-2 -left-2 w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-orange-600 via-amber-600 to-orange-500 rounded-2xl p-6 shadow-xl border-2 border-orange-300">
                  <div className="absolute top-3 right-3 text-2xl opacity-20">🎼</div>
                  <h3 className="text-xl font-bold text-white leading-relaxed mb-2">
                    {currentQuestion.question}
                  </h3>
                  {currentQuestion.audio_url && (
                    <div className="flex items-center gap-2 mt-3 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
                      <span className="text-2xl">🎵</span>
                      <span className="text-sm text-amber-100">{currentQuestion.audio_url}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Messages */}
              {justSubmitted && (
                <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white p-4 rounded-2xl shadow-xl animate-scale-in border-2 border-emerald-300">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl animate-bounce">✅</div>
                    <div className="flex-1">
                      <div className="font-bold text-lg">Answer Submitted!</div>
                      <div className="text-sm text-emerald-100">Your response has been recorded</div>
                    </div>
                  </div>
                </div>
              )}
              
              {hasSubmitted && !justSubmitted && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border-2 border-emerald-300 shadow-md">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold text-emerald-900">Response Recorded ✓</div>
                      <div className="text-sm text-emerald-700">Waiting for instructor to reveal results...</div>
                    </div>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent"></div>
                  </div>
                </div>
              )}

              {!hasSubmitted && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-2xl border-2 border-blue-200 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">👆</div>
                    <div>
                      <div className="font-bold text-blue-900">Select Your Answer</div>
                      <div className="text-sm text-blue-700">Choose the option you think is correct</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => submitResponse(index)}
                    disabled={hasSubmitted || submitting}
                    className={`group w-full text-left p-5 rounded-2xl transition-all duration-300 transform ${
                      userResponse === index && submissionAnimation
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-2xl scale-105 animate-pulse'
                        : userResponse === index
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl'
                        : hasSubmitted
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                        : 'bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 text-gray-900 border-2 border-orange-200 hover:border-orange-400 hover:shadow-xl hover:scale-102 active:scale-98'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${
                        userResponse === index
                          ? 'bg-white text-emerald-600'
                          : hasSubmitted
                          ? 'bg-gray-200 text-gray-400'
                          : 'bg-gradient-to-br from-orange-400 to-amber-500 text-white group-hover:from-orange-500 group-hover:to-amber-600'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="flex-1 text-base font-medium">{option}</span>
                      {userResponse === index && hasSubmitted && (
                        <CheckCircle className="h-6 w-6 flex-shrink-0 animate-scale-in" />
                      )}
                      {submitting && userResponse === index && (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent flex-shrink-0"></div>
                      )}
                      {!hasSubmitted && userResponse !== index && (
                        <div className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* What's Next Indicator */}
              {!hasSubmitted && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border-2 border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🔮</div>
                    <div className="flex-1">
                      <div className="font-bold text-purple-900">What's Next?</div>
                      <div className="text-sm text-purple-700">After you submit, wait for instructor to show results</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            // ========== RESULTS MODE ==========
            <div className="space-y-4">
              {/* Results Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl border-2 border-indigo-300 text-white animate-fade-in">
                <div className="text-center">
                  <div className="text-4xl mb-2 animate-bounce">📊</div>
                  <h3 className="text-2xl font-bold mb-1">Live Results!</h3>
                  <p className="text-indigo-100 text-sm">Here's how everyone answered</p>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {responseStats.map((stat, index) => (
                  <div
                    key={index}
                    className={`relative overflow-hidden rounded-2xl p-5 text-center transition-all duration-500 animate-scale-in border-2 ${
                      stat.isCorrect
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-300 shadow-xl scale-105'
                        : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {stat.isCorrect && (
                      <div className="absolute top-2 right-2 text-3xl animate-bounce">⭐</div>
                    )}
                    <div className={`text-4xl font-bold mb-1 ${stat.isCorrect ? 'text-white' : 'text-gray-700'}`}>
                      {stat.count}
                    </div>
                    <div className={`text-xl font-bold mb-1 ${stat.isCorrect ? 'text-emerald-100' : 'text-gray-600'}`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className={`text-lg ${stat.isCorrect ? 'text-white' : 'text-gray-500'}`}>
                      {stat.percentage.toFixed(0)}%
                    </div>
                    {stat.isCorrect && (
                      <div className="mt-2 text-sm font-bold text-emerald-100">Correct!</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Participation Badge */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-300 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">👥</div>
                  <div className="flex-1">
                    <div className="font-bold text-amber-900">{totalResponses} Students Responded</div>
                    <div className="text-sm text-amber-700">Great participation! 🎉</div>
                  </div>
                </div>
              </div>
              
              {/* Detailed Breakdown */}
              <div className="space-y-2">
                {responseStats.map((stat, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 animate-fade-in ${
                      stat.isCorrect
                        ? 'border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg'
                        : 'border-gray-200 bg-white'
                    }`}
                    style={{ animationDelay: `${(index + 2) * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          stat.isCorrect
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className={`font-medium ${stat.isCorrect ? 'text-green-900' : 'text-gray-700'}`}>
                          {stat.option}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {stat.isCorrect && (
                          <Badge className="bg-green-600 text-white">✓ Correct</Badge>
                        )}
                        <span className={`font-bold ${stat.isCorrect ? 'text-green-700' : 'text-gray-600'}`}>
                          {stat.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={stat.percentage} 
                      className={`h-3 ${stat.isCorrect ? 'bg-green-100' : ''}`}
                    />
                  </div>
                ))}
              </div>

              {/* Explanation */}
              {currentQuestion.explanation && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-5 rounded-2xl border-2 border-blue-200 shadow-md animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">💡</div>
                    <div>
                      <h4 className="font-bold text-blue-900 mb-2">Explanation</h4>
                      <p className="text-blue-800 text-sm leading-relaxed">{currentQuestion.explanation}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* What's Next in Results Mode */}
              {!isLastQuestion ? (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border-2 border-purple-300 shadow-md animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl animate-bounce">→</div>
                    <div className="flex-1">
                      <div className="font-bold text-purple-900">Up Next...</div>
                      <div className="text-sm text-purple-700">Instructor will move to Question {activePoll.current_question_index + 2} soon</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-300 shadow-md animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🏁</div>
                    <div className="flex-1">
                      <div className="font-bold text-amber-900">Final Question!</div>
                      <div className="text-sm text-amber-700">This is the last question. Full results coming up!</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
              <span className="font-medium">Question {activePoll.current_question_index + 1} of {activePoll.questions.length}</span>
              <span className="text-orange-100">{Math.round(((activePoll.current_question_index + 1) / activePoll.questions.length) * 100)}% Complete</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${((activePoll.current_question_index + 1) / activePoll.questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Live Stats */}
          <div className="flex items-center justify-between mt-3 text-white text-sm">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Users className="h-4 w-4" />
              <span className="font-semibold">{totalResponses}</span>
              <span className="text-orange-100">answered</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Clock className="h-4 w-4" />
              <span className="text-orange-100">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {!activePoll.show_results ? (
            // ========== ANSWER MODE ==========
            <>
              {/* Question Card */}
              <div className="relative">
                <div className="absolute -top-2 -left-2 w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-orange-600 via-amber-600 to-orange-500 rounded-2xl p-6 shadow-xl border-2 border-orange-300">
                  <div className="absolute top-3 right-3 text-2xl opacity-20">🎼</div>
                  <h3 className="text-xl font-bold text-white leading-relaxed mb-2">
                    {currentQuestion.question}
                  </h3>
                  {currentQuestion.audio_url && (
                    <div className="flex items-center gap-2 mt-3 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
                      <span className="text-2xl">🎵</span>
                      <span className="text-sm text-amber-100">{currentQuestion.audio_url}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Messages */}
              {justSubmitted && (
                <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white p-4 rounded-2xl shadow-xl animate-scale-in border-2 border-emerald-300">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl animate-bounce">✅</div>
                    <div className="flex-1">
                      <div className="font-bold text-lg">Answer Submitted!</div>
                      <div className="text-sm text-emerald-100">Your response has been recorded</div>
                    </div>
                  </div>
                </div>
              )}
              
              {hasSubmitted && !justSubmitted && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border-2 border-emerald-300 shadow-md">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold text-emerald-900">Response Recorded ✓</div>
                      <div className="text-sm text-emerald-700">Waiting for instructor to reveal results...</div>
                    </div>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent"></div>
                  </div>
                </div>
              )}

              {!hasSubmitted && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-2xl border-2 border-blue-200 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">👆</div>
                    <div>
                      <div className="font-bold text-blue-900">Select Your Answer</div>
                      <div className="text-sm text-blue-700">Choose the option you think is correct</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => submitResponse(index)}
                    disabled={hasSubmitted || submitting}
                    className={`group w-full text-left p-5 rounded-2xl transition-all duration-300 transform ${
                      userResponse === index && submissionAnimation
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-2xl scale-105 animate-pulse'
                        : userResponse === index
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl'
                        : hasSubmitted
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                        : 'bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 text-gray-900 border-2 border-orange-200 hover:border-orange-400 hover:shadow-xl hover:scale-102 active:scale-98'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${
                        userResponse === index
                          ? 'bg-white text-emerald-600'
                          : hasSubmitted
                          ? 'bg-gray-200 text-gray-400'
                          : 'bg-gradient-to-br from-orange-400 to-amber-500 text-white group-hover:from-orange-500 group-hover:to-amber-600'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="flex-1 text-base font-medium">{option}</span>
                      {userResponse === index && hasSubmitted && (
                        <CheckCircle className="h-6 w-6 flex-shrink-0 animate-scale-in" />
                      )}
                      {submitting && userResponse === index && (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent flex-shrink-0"></div>
                      )}
                      {!hasSubmitted && userResponse !== index && (
                        <div className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* What's Next Indicator */}
              {!hasSubmitted && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border-2 border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🔮</div>
                    <div className="flex-1">
                      <div className="font-bold text-purple-900">What's Next?</div>
                      <div className="text-sm text-purple-700">After you submit, wait for instructor to show results</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            // ========== RESULTS MODE ==========
            <div className="space-y-4">
              {/* Results Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl border-2 border-indigo-300 text-white animate-fade-in">
                <div className="text-center">
                  <div className="text-4xl mb-2 animate-bounce">📊</div>
                  <h3 className="text-2xl font-bold mb-1">Live Results!</h3>
                  <p className="text-indigo-100 text-sm">Here's how everyone answered</p>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {responseStats.map((stat, index) => (
                  <div
                    key={index}
                    className={`relative overflow-hidden rounded-2xl p-5 text-center transition-all duration-500 animate-scale-in border-2 ${
                      stat.isCorrect
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-300 shadow-xl scale-105'
                        : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {stat.isCorrect && (
                      <div className="absolute top-2 right-2 text-3xl animate-bounce">⭐</div>
                    )}
                    <div className={`text-4xl font-bold mb-1 ${stat.isCorrect ? 'text-white' : 'text-gray-700'}`}>
                      {stat.count}
                    </div>
                    <div className={`text-xl font-bold mb-1 ${stat.isCorrect ? 'text-emerald-100' : 'text-gray-600'}`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className={`text-lg ${stat.isCorrect ? 'text-white' : 'text-gray-500'}`}>
                      {stat.percentage.toFixed(0)}%
                    </div>
                    {stat.isCorrect && (
                      <div className="mt-2 text-sm font-bold text-emerald-100">Correct!</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Participation Badge */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-300 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">👥</div>
                  <div className="flex-1">
                    <div className="font-bold text-amber-900">{totalResponses} Students Responded</div>
                    <div className="text-sm text-amber-700">Great participation! 🎉</div>
                  </div>
                </div>
              </div>
              
              {/* Detailed Breakdown */}
              <div className="space-y-2">
                {responseStats.map((stat, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 animate-fade-in ${
                      stat.isCorrect
                        ? 'border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg'
                        : 'border-gray-200 bg-white'
                    }`}
                    style={{ animationDelay: `${(index + 2) * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          stat.isCorrect
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className={`font-medium ${stat.isCorrect ? 'text-green-900' : 'text-gray-700'}`}>
                          {stat.option}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {stat.isCorrect && (
                          <Badge className="bg-green-600 text-white">✓ Correct</Badge>
                        )}
                        <span className={`font-bold ${stat.isCorrect ? 'text-green-700' : 'text-gray-600'}`}>
                          {stat.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={stat.percentage} 
                      className={`h-3 ${stat.isCorrect ? 'bg-green-100' : ''}`}
                    />
                  </div>
                ))}
              </div>

              {/* Explanation */}
              {currentQuestion.explanation && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-5 rounded-2xl border-2 border-blue-200 shadow-md animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">💡</div>
                    <div>
                      <h4 className="font-bold text-blue-900 mb-2">Explanation</h4>
                      <p className="text-blue-800 text-sm leading-relaxed">{currentQuestion.explanation}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* What's Next in Results Mode */}
              {!isLastQuestion ? (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border-2 border-purple-300 shadow-md animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl animate-bounce">→</div>
                    <div className="flex-1">
                      <div className="font-bold text-purple-900">Up Next...</div>
                      <div className="text-sm text-purple-700">Instructor will move to Question {activePoll.current_question_index + 2} soon</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-300 shadow-md animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🏁</div>
                    <div className="flex-1">
                      <div className="font-bold text-amber-900">Final Question!</div>
                      <div className="text-sm text-amber-700">This is the last question. Full results coming up!</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
  );
};