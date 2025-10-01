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
      <div className="space-y-6">
        {/* Completion Celebration */}
        <div className="bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-400 p-8 rounded-3xl shadow-xl border border-white/20 relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div>
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute -bottom-4 -left-4 w-40 h-40 bg-yellow-400/30 rounded-full blur-3xl animate-pulse delay-75"></div>
          
          <div className="relative z-10">
            <div className="text-8xl mb-6 animate-bounce">🎉</div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Poll Complete!
            </h2>
            <p className="text-xl text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
              Thank you for participating in "{activePoll.title}". Your responses have been recorded and will contribute to your participation grade.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-6 border border-white/30">
                <div className="text-3xl mb-2">📚</div>
                <div className="text-2xl font-bold text-white mb-1">
                  {activePoll.questions.length}
                </div>
                <div className="text-white/80">Questions Answered</div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-6 border border-white/30">
                <div className="text-3xl mb-2">⭐</div>
                <div className="text-2xl font-bold text-white mb-1">
                  100%
                </div>
                <div className="text-white/80">Participation</div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-6 border border-white/30">
                <div className="text-3xl mb-2">🎵</div>
                <div className="text-2xl font-bold text-white mb-1">
                  Complete
                </div>
                <div className="text-white/80">Status</div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold text-white mb-3">What's Next?</h3>
              <div className="text-white/90 space-y-2">
                <p>✓ Your responses are saved and counted toward participation</p>
                <p>✓ Review the correct answers shown below</p>
                <p>✓ Wait for your instructor to start the next activity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Final Results Review */}
        <Card className="bg-white/95 backdrop-blur-sm border border-white/30 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900 flex items-center gap-3">
              <span className="text-2xl">📊</span>
              Final Results - {activePoll.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activePoll.questions.map((question, questionIndex) => {
                const questionResponses = responses.filter(r => r.question_index === questionIndex);
                const questionStats = question.options.map((option, optionIndex) => {
                  const count = questionResponses.filter(r => r.selected_option === optionIndex).length;
                  const percentage = questionResponses.length > 0 ? (count / questionResponses.length) * 100 : 0;
                  return { option, count, percentage, isCorrect: optionIndex === question.correct_answer };
                });

                return (
                  <div key={questionIndex} className="border border-gray-200 rounded-xl p-6 bg-gray-50/50">
                    <h4 className="font-semibold text-gray-900 mb-4">
                      {questionIndex + 1}. {question.question}
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {questionStats.map((stat, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            stat.isCorrect
                              ? 'border-green-500 bg-green-50 text-green-900'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + optionIndex)}.
                              </span>
                              {stat.option}
                            </span>
                            <div className="flex items-center gap-2">
                              {stat.isCorrect && (
                                <Badge className="bg-green-600 text-white">✓ Correct</Badge>
                              )}
                              <span className="text-sm text-gray-600">
                                {stat.percentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <Progress value={stat.percentage} className="mt-2 h-2" />
                        </div>
                      ))}
                    </div>
                    
                    {question.explanation && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="font-medium text-blue-900 mb-2">💡 Explanation:</h5>
                        <p className="text-blue-800 text-sm">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">{/* Rest of the existing component remains the same */}
      {/* Beautiful Classroom Display */}
      <div className="bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 p-8 rounded-3xl shadow-xl border border-slate-400/20 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent"></div>
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-400/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-rose-400/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Live Response Count */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-gray-200 shadow-lg">
            <div className="text-center">
              <div className="text-4xl mb-2">🎵</div>
              <div className="text-5xl md:text-6xl font-light text-gray-800 mb-2 tracking-tight">
                {totalResponses}
              </div>
              <div className="text-lg font-medium text-gray-700 tracking-wide">
                Responses
              </div>
              <div className="text-sm text-gray-600 mt-1 font-light">
                Question {activePoll.current_question_index + 1} of {activePoll.questions.length}
              </div>
            </div>
          </div>

          {/* Poll Status */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-gray-200 shadow-lg">
            <div className="text-center">
              <div className="text-4xl mb-3">✨</div>
              <div className="text-xl font-medium text-gray-800 mb-2 leading-relaxed">
                {activePoll.title}
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-base font-medium text-gray-700 tracking-wide">Live Session</span>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-75"></div>
              </div>
            </div>
          </div>

          {/* Participation Rate */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-gray-200 shadow-lg">
            <div className="text-center">
              <div className="text-4xl mb-2">🌟</div>
              <div className="text-4xl md:text-5xl font-light text-gray-800 mb-2 tracking-tight">
                {totalResponses > 0 ? Math.round((totalResponses / 30) * 100) : 0}%
              </div>
              <div className="text-lg font-medium text-gray-700 tracking-wide">
                Participation
              </div>
              <div className="text-sm text-gray-600 mt-1 font-light">
                Every voice matters!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Poll Header */}
      <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-gray-900">{activePoll.title}</CardTitle>
              <p className="text-gray-600 mt-1">{activePoll.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white animate-pulse border-0 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-bounce"></div>
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
              {/* Enhanced Submission Status */}
              {justSubmitted && (
                <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-6 rounded-xl shadow-lg mb-6 animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-slide-right"></div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-3xl animate-bounce">✅</div>
                    <div>
                      <div className="text-xl font-bold">Response Submitted!</div>
                      <div className="text-emerald-100">Your answer has been recorded and sent to your instructor</div>
                    </div>
                    <div className="text-3xl animate-bounce delay-100">🎵</div>
                  </div>
                </div>
              )}
              
              {hasSubmitted && !justSubmitted && (
                <div className="flex items-center gap-3 text-emerald-600 font-medium mb-4 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <CheckCircle className="h-6 w-6" />
                  <div>
                    <div className="font-semibold">Response Recorded</div>
                    <div className="text-sm text-emerald-700">Waiting for instructor to show results...</div>
                  </div>
                </div>
              )}
              
              {currentQuestion.options.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => {
                    console.log('🖱️ BUTTON CLICKED!', { 
                      optionIndex: index, 
                      option: option,
                      hasSubmitted, 
                      submitting,
                      disabled: hasSubmitted || submitting,
                      timestamp: new Date().toISOString()
                    });
                    submitResponse(index);
                  }}
                  disabled={hasSubmitted || submitting}
                  className={`w-full text-left justify-start p-6 h-auto transition-all duration-300 relative overflow-hidden ${
                    submitting && userResponse !== index
                      ? 'opacity-50 pointer-events-none'
                      : userResponse === index && submissionAnimation
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl border-0 transform scale-[1.05] animate-pulse'
                      : userResponse === index
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg border-0 transform scale-[1.02]'
                      : hasSubmitted
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'
                      : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md hover:transform hover:scale-[1.01]'
                  }`}
                >
                  {submitting && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-slide-right"></div>
                  )}
                  <div className="flex items-center w-full">
                    <span className="font-bold mr-4 text-lg">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="flex-1">{option}</span>
                    {userResponse === index && hasSubmitted && (
                      <div className="ml-3 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                    )}
                    {submitting && (
                      <div className="ml-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                </Button>
              ))}
              
              {submitting && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                  <p className="text-emerald-600 font-medium">Submitting your response...</p>
                </div>
              )}
            </div>
          ) : (
            // Results Display Mode
            <div className="space-y-4">
              {/* Beautiful Results Display for Classroom */}
              <div className="bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 p-8 rounded-3xl shadow-xl border border-slate-400/20 relative overflow-hidden mb-8">
                {/* Decorative elements */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent"></div>
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 text-center">
                  <div className="text-4xl mb-6 text-white">🎼 Live Results</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {responseStats.map((stat, index) => (
                      <div key={index} className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 shadow-lg transform hover:scale-105 transition-all duration-300">
                        <div className="text-3xl md:text-5xl font-light text-gray-800 mb-3 tracking-tight">
                          {stat.count}
                        </div>
                        <div className="text-xl font-medium text-gray-700 mb-2">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <div className="text-lg text-gray-600 font-light">
                          {stat.percentage.toFixed(0)}%
                        </div>
                        {stat.isCorrect && (
                          <div className="text-2xl mt-3 animate-bounce">🌟</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-xl text-white/90 mt-8 font-light tracking-wide">
                    {totalResponses} responses received ✨
                  </div>
                </div>
              </div>
              
              {/* Detailed Results for Individual View */}
              {responseStats.map((stat, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                    stat.isCorrect
                      ? 'border-green-300 bg-green-50 shadow-lg'
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
                        <Badge className="bg-green-600 text-white animate-bounce">
                          ✓ Correct
                        </Badge>
                      )}
                      {userResponse === index && (
                        <Badge className="bg-blue-600 text-white">Your Answer</Badge>
                      )}
                      <span className="text-sm font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
                        {stat.count} ({stat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={stat.percentage} 
                    className={`h-3 transition-all duration-700 ${
                      stat.isCorrect ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  />
                </div>
              ))}
              
              {currentQuestion.explanation && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl animate-fadeIn">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    💡 Explanation:
                  </h4>
                  <p className="text-blue-800">{currentQuestion.explanation}</p>
                </div>
              )}

              <div className="text-center text-sm text-gray-500 mt-4">
                Results update in real-time as classmates submit answers
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};