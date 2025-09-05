import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Play, Square, Eye, EyeOff, Users, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

interface LiveQuestionControllerProps {
  poll: Poll;
  onPollUpdate: (poll: Poll) => void;
}

interface ResponseData {
  id: string;
  poll_id: string;
  question_index: number;
  selected_option: number;
  student_id: string;
  response_time: string;
}

export const LiveQuestionController: React.FC<LiveQuestionControllerProps> = ({ poll, onPollUpdate }) => {
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchResponses();
    
    // Subscribe to real-time response updates
    const channel = supabase
      .channel('poll-responses')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mus240_poll_responses',
          filter: `poll_id=eq.${poll.id},question_index=eq.${poll.current_question_index}`
        },
        () => fetchResponses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poll.id, poll.current_question_index]);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_poll_responses')
        .select('*')
        .eq('poll_id', poll.id)
        .eq('question_index', poll.current_question_index);

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const updatePollState = async (updates: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('mus240_polls')
        .update(updates)
        .eq('id', poll.id);

      if (error) throw error;

      onPollUpdate({ ...poll, ...updates });
      toast.success('Poll updated successfully');
    } catch (error) {
      console.error('Error updating poll:', error);
      toast.error('Failed to update poll');
    } finally {
      setLoading(false);
    }
  };

  const startLiveSession = () => {
    updatePollState({
      is_live_session: true,
      current_question_index: 0,
      show_results: false
    });
  };

  const stopLiveSession = () => {
    updatePollState({
      is_live_session: false,
      show_results: false
    });
  };

  const nextQuestion = () => {
    const nextIndex = Math.min(poll.current_question_index + 1, poll.questions.length - 1);
    updatePollState({
      current_question_index: nextIndex,
      show_results: false
    });
  };

  const previousQuestion = () => {
    const prevIndex = Math.max(poll.current_question_index - 1, 0);
    updatePollState({
      current_question_index: prevIndex,
      show_results: false
    });
  };

  const toggleResults = () => {
    updatePollState({
      show_results: !poll.show_results
    });
  };

  const currentQuestion = poll.questions[poll.current_question_index];
  const totalResponses = responses.length;

  // Calculate response percentages
  const responseStats = currentQuestion?.options.map((option, index) => {
    const count = responses.filter(r => r.selected_option === index).length;
    const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
    return { option, count, percentage, isCorrect: index === currentQuestion.correct_answer };
  }) || [];

  if (!currentQuestion) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm border border-white/30 shadow-xl">
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">No questions available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Controls */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            Live Session Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            {!poll.is_live_session ? (
              <Button
                onClick={startLiveSession}
                disabled={loading}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Live Session
              </Button>
            ) : (
              <Button
                onClick={stopLiveSession}
                disabled={loading}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Session
              </Button>
            )}
            
            <Badge variant={poll.is_live_session ? "destructive" : "secondary"} className="text-sm">
              {poll.is_live_session ? "LIVE" : "OFFLINE"}
            </Badge>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              {totalResponses} responses
            </div>
          </div>

          {poll.is_live_session && (
            <div className="flex items-center gap-2">
              <Button
                onClick={previousQuestion}
                disabled={loading || poll.current_question_index === 0}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm font-medium text-gray-700 px-3">
                Question {poll.current_question_index + 1} of {poll.questions.length}
              </span>
              
              <Button
                onClick={nextQuestion}
                disabled={loading || poll.current_question_index === poll.questions.length - 1}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={toggleResults}
                disabled={loading}
                className={`ml-4 ${poll.show_results 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700' 
                  : 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
                } text-white shadow-lg`}
              >
                {poll.show_results ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Results
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Results
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Question Display */}
      <Card className="bg-white/95 backdrop-blur-sm border border-white/30 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900">
            Question {poll.current_question_index + 1}: {currentQuestion.question}
          </CardTitle>
          {currentQuestion.audio_url && (
            <p className="text-sm text-blue-600">🎵 Audio: {currentQuestion.audio_url}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {responseStats.map((stat, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  stat.isCorrect
                    ? 'border-green-300 bg-green-50'
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
                    <span className="text-sm font-medium text-gray-600">
                      {stat.count} ({stat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <Progress value={stat.percentage} className="h-2" />
              </div>
            ))}
          </div>
          
          {currentQuestion.explanation && poll.show_results && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h4 className="font-semibold text-blue-900 mb-2">Explanation:</h4>
              <p className="text-blue-800">{currentQuestion.explanation}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};