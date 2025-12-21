import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  Square, 
  Eye, 
  EyeOff, 
  Radio,
  Users,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AcademyPoll } from './AcademyPollSystem';

interface LivePollControllerProps {
  poll: AcademyPoll;
  onClose: () => void;
}

interface ResponseCount {
  option: number;
  count: number;
}

export const LivePollController: React.FC<LivePollControllerProps> = ({ poll, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(poll.current_question_index || 0);
  const [showResults, setShowResults] = useState(poll.show_results || false);
  const [responseCounts, setResponseCounts] = useState<ResponseCount[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(false);

  const currentQuestion = poll.questions[currentIndex];
  const totalQuestions = poll.questions.length;

  // Fetch response counts for current question
  useEffect(() => {
    fetchResponseCounts();
  }, [currentIndex, poll.id]);

  // Real-time subscription for new responses
  useEffect(() => {
    const channel = supabase
      .channel(`poll-responses-${poll.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gw_academy_poll_responses',
          filter: `poll_id=eq.${poll.id}`
        },
        () => {
          fetchResponseCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poll.id, currentIndex]);

  const fetchResponseCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_academy_poll_responses')
        .select('selected_option')
        .eq('poll_id', poll.id)
        .eq('question_index', currentIndex);

      if (error) throw error;

      // Count responses per option
      const counts: Record<number, number> = {};
      (data || []).forEach(r => {
        counts[r.selected_option] = (counts[r.selected_option] || 0) + 1;
      });

      const countArray = Object.entries(counts).map(([option, count]) => ({
        option: parseInt(option),
        count
      }));

      setResponseCounts(countArray);
      setTotalResponses(data?.length || 0);
    } catch (error) {
      console.error('Error fetching response counts:', error);
    }
  };

  const updatePollState = async (updates: Record<string, any>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('gw_academy_polls')
        .update(updates)
        .eq('id', poll.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating poll:', error);
      toast.error('Failed to update poll');
    } finally {
      setLoading(false);
    }
  };

  const goToQuestion = async (index: number) => {
    if (index < 0 || index >= totalQuestions) return;
    setCurrentIndex(index);
    await updatePollState({ current_question_index: index, show_results: false });
    setShowResults(false);
  };

  const toggleResults = async () => {
    const newValue = !showResults;
    setShowResults(newValue);
    await updatePollState({ show_results: newValue });
  };

  const endLiveSession = async () => {
    await updatePollState({ is_live_session: false, is_active: false });
    toast.success('Live session ended');
    onClose();
  };

  const getResponseCountForOption = (optionIdx: number) => {
    return responseCounts.find(r => r.option === optionIdx)?.count || 0;
  };

  const getPercentageForOption = (optionIdx: number) => {
    if (totalResponses === 0) return 0;
    return (getResponseCountForOption(optionIdx) / totalResponses) * 100;
  };

  if (!currentQuestion) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p>No questions in this poll.</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="animate-pulse">
              <Radio className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
            <CardTitle>{poll.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Users className="h-3 w-3 mr-1" />
              {totalResponses} responses
            </Badge>
            <Button variant="destructive" size="sm" onClick={endLiveSession} disabled={loading}>
              <Square className="h-4 w-4 mr-1" />
              End Session
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-6 space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <Progress value={((currentIndex + 1) / totalQuestions) * 100} className="flex-1" />
        </div>

        {/* Current Question */}
        <div className="bg-muted/50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">{currentQuestion.question}</h3>
          
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => (
              <div key={idx} className="relative">
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <span>
                    <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {option}
                  </span>
                  {showResults && (
                    <Badge variant="secondary">
                      {getResponseCountForOption(idx)} ({getPercentageForOption(idx).toFixed(0)}%)
                    </Badge>
                  )}
                </div>
                {showResults && (
                  <div 
                    className="absolute inset-0 bg-primary/10 rounded-lg transition-all"
                    style={{ width: `${getPercentageForOption(idx)}%` }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => goToQuestion(currentIndex - 1)}
            disabled={currentIndex === 0 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <Button
            variant="outline"
            onClick={toggleResults}
            disabled={loading}
          >
            {showResults ? (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Hide Results
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Show Results
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => goToQuestion(currentIndex + 1)}
            disabled={currentIndex === totalQuestions - 1 || loading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
