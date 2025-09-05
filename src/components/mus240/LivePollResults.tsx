import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, CheckCircle, X, Play, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Poll {
  id: string;
  title: string;
  description: string;
  questions: any; // Using any to handle Supabase Json type
  is_active: boolean;
  expires_at: string | null;
}

interface PollResponse {
  id: string;
  poll_id: string;
  question_index: number;
  selected_option: number;
  student_id: string;
  response_time: string;
}

interface ResponseStats {
  [questionIndex: number]: {
    totalResponses: number;
    optionCounts: number[];
    responseRate: number;
  };
}

export const LivePollResults = () => {
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [responses, setResponses] = useState<PollResponse[]>([]);
  const [responseStats, setResponseStats] = useState<ResponseStats>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    fetchActivePoll();
    
    // Subscribe to real-time updates
    const pollChannel = supabase
      .channel('poll-admin-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mus240_polls'
        },
        (payload) => {
          console.log('Poll update:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const poll = payload.new as any;
            if (poll.is_active) {
              setActivePoll(poll);
              setCurrentQuestion(0);
            } else if (poll.id === activePoll?.id && !poll.is_active) {
              setActivePoll(null);
            }
          }
        }
      )
      .subscribe();

    const responseChannel = supabase
      .channel('response-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mus240_poll_responses'
        },
        (payload) => {
          console.log('Response update:', payload);
          const newResponse = payload.new as PollResponse;
          setResponses(prev => [...prev, newResponse]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pollChannel);
      supabase.removeChannel(responseChannel);
    };
  }, [activePoll?.id]);

  useEffect(() => {
    if (activePoll) {
      fetchResponses();
    }
  }, [activePoll]);

  useEffect(() => {
    if (activePoll && responses.length > 0) {
      calculateStats();
    }
  }, [responses, activePoll]);

  const fetchActivePoll = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_polls')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching poll:', error);
        return;
      }

      setActivePoll(data);
    } catch (error) {
      console.error('Error fetching active poll:', error);
    }
  };

  const fetchResponses = async () => {
    if (!activePoll) return;

    try {
      const { data, error } = await supabase
        .from('mus240_poll_responses')
        .select('*')
        .eq('poll_id', activePoll.id)
        .order('response_time', { ascending: true });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const calculateStats = () => {
    if (!activePoll) return;

    const stats: ResponseStats = {};
    const uniqueStudents = new Set<string>();

    activePoll.questions.forEach((_, questionIndex) => {
      const questionResponses = responses.filter(r => r.question_index === questionIndex);
      const optionCounts = new Array(activePoll.questions[questionIndex].options.length).fill(0);
      
      questionResponses.forEach(response => {
        optionCounts[response.selected_option]++;
        uniqueStudents.add(response.student_id);
      });

      stats[questionIndex] = {
        totalResponses: questionResponses.length,
        optionCounts,
        responseRate: questionResponses.length > 0 ? (questionResponses.length / uniqueStudents.size) * 100 : 0
      };
    });

    setTotalStudents(uniqueStudents.size);
    setResponseStats(stats);
  };

  const togglePoll = async (pollId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('mus240_polls')
        .update({ is_active: !isActive })
        .eq('id', pollId);

      if (error) throw error;
      toast.success(isActive ? 'Poll stopped' : 'Poll started');
    } catch (error) {
      console.error('Error toggling poll:', error);
      toast.error('Failed to toggle poll');
    }
  };

  if (!activePoll) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Live Poll Results
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="space-y-4">
            <Square className="h-16 w-16 text-gray-400 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-700">No Active Poll</h3>
            <p className="text-gray-500">
              Start a poll from the instructor console to see live results here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuestionData = activePoll.questions[currentQuestion];
  const currentStats = responseStats[currentQuestion] || {
    totalResponses: 0,
    optionCounts: new Array(currentQuestionData.options.length).fill(0),
    responseRate: 0
  };

  const maxCount = Math.max(...currentStats.optionCounts, 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Poll Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                {activePoll.title}
              </CardTitle>
              {activePoll.description && (
                <p className="text-gray-600 mt-1">{activePoll.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={activePoll.is_active ? "default" : "secondary"}>
                {activePoll.is_active ? 'Live' : 'Stopped'}
              </Badge>
              <Button
                onClick={() => togglePoll(activePoll.id, activePoll.is_active)}
                variant={activePoll.is_active ? "destructive" : "default"}
                size="sm"
              >
                {activePoll.is_active ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop Poll
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Poll
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{totalStudents} students participating</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>{currentStats.totalResponses} responses to current question</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            <span className="font-medium">
              Question {currentQuestion + 1} of {activePoll.questions.length}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => Math.min(activePoll.questions.length - 1, prev + 1))}
              disabled={currentQuestion === activePoll.questions.length - 1}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Question Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {currentQuestionData.question}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{currentStats.totalResponses} total responses</span>
            <span>{currentStats.responseRate.toFixed(1)}% response rate</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestionData.options.map((option, index) => {
            const count = currentStats.optionCounts[index] || 0;
            const percentage = currentStats.totalResponses > 0 
              ? (count / currentStats.totalResponses) * 100 
              : 0;
            const isCorrect = currentQuestionData.correct_answer === index;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                    <span>{option}</span>
                    {isCorrect && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{count}</span>
                    <span className="text-gray-500">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className={`h-3 ${isCorrect ? 'bg-green-100' : ''}`}
                />
              </div>
            );
          })}

          {currentQuestionData.explanation && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
              <p className="text-blue-800">{currentQuestionData.explanation}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};