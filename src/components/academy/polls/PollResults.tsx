import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Users, BarChart3, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AcademyPoll } from './AcademyPollSystem';

interface PollResultsProps {
  poll: AcademyPoll;
  onClose: () => void;
}

interface QuestionResult {
  questionIndex: number;
  question: string;
  options: string[];
  responses: { option: number; count: number }[];
  totalResponses: number;
}

export const PollResults: React.FC<PollResultsProps> = ({ poll, onClose }) => {
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalParticipants, setTotalParticipants] = useState(0);

  useEffect(() => {
    fetchResults();
  }, [poll.id]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_academy_poll_responses')
        .select('question_index, selected_option, student_id')
        .eq('poll_id', poll.id);

      if (error) throw error;

      // Get unique participants
      const uniqueStudents = new Set(data?.map(r => r.student_id) || []);
      setTotalParticipants(uniqueStudents.size);

      // Process results per question
      const questionResults: QuestionResult[] = poll.questions.map((q, idx) => {
        const questionResponses = data?.filter(r => r.question_index === idx) || [];
        
        // Count per option
        const optionCounts: Record<number, number> = {};
        questionResponses.forEach(r => {
          optionCounts[r.selected_option] = (optionCounts[r.selected_option] || 0) + 1;
        });

        return {
          questionIndex: idx,
          question: q.question,
          options: q.options,
          responses: Object.entries(optionCounts).map(([opt, count]) => ({
            option: parseInt(opt),
            count
          })),
          totalResponses: questionResponses.length
        };
      });

      setResults(questionResults);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCountForOption = (result: QuestionResult, optionIdx: number) => {
    return result.responses.find(r => r.option === optionIdx)?.count || 0;
  };

  const getPercentage = (result: QuestionResult, optionIdx: number) => {
    if (result.totalResponses === 0) return 0;
    return (getCountForOption(result, optionIdx) / result.totalResponses) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          Loading results...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Polls
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {poll.title} - Results
            </CardTitle>
            <Badge variant="outline">
              <Users className="h-3 w-3 mr-1" />
              {totalParticipants} participants
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {results.map((result, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {idx + 1}. {result.question}
                </h4>
                <Badge variant="secondary">
                  {result.totalResponses} responses
                </Badge>
              </div>

              <div className="space-y-2">
                {result.options.map((option, optionIdx) => {
                  const percentage = getPercentage(result, optionIdx);
                  const count = getCountForOption(result, optionIdx);
                  const isCorrect = poll.questions[idx].correct_answer === optionIdx;
                  
                  return (
                    <div key={optionIdx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="font-medium">
                            {String.fromCharCode(65 + optionIdx)}.
                          </span>
                          {option}
                          {isCorrect && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className={`h-2 ${isCorrect ? '[&>div]:bg-green-500' : ''}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {results.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No questions in this poll.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
