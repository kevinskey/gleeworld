import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Users, CheckCircle, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Poll {
  id: string;
  title: string;
  description: string;
  questions: any; // Using any to handle Supabase Json type
  is_active: boolean;
  expires_at: string | null;
}

interface StudentPollInterfaceProps {
  studentId?: string;
}

export const StudentPollInterface: React.FC<StudentPollInterfaceProps> = ({ studentId }) => {
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [studentName, setStudentName] = useState(studentId || '');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchActivePoll();
    
    // Subscribe to real-time poll updates
    const channel = supabase
      .channel('poll-updates')
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
              setSelectedAnswers({});
              setSubmittedAnswers({});
            } else if (poll.id === activePoll?.id && !poll.is_active) {
              setActivePoll(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePoll?.id]);

  const fetchActivePoll = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_polls')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching poll:', error);
        return;
      }

      setActivePoll(data);
    } catch (error) {
      console.error('Error fetching active poll:', error);
    }
  };

  const submitAnswer = async (questionIndex: number, selectedOption: number) => {
    if (!activePoll) return;
    if (!user?.id) {
      toast.error('Please sign in to submit your response.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('mus240_poll_responses')
        .insert({
          poll_id: activePoll.id,
          question_index: questionIndex,
          selected_option: selectedOption,
          student_id: user.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already answered this question');
        } else {
          throw error;
        }
      } else {
        setSubmittedAnswers(prev => ({ ...prev, [questionIndex]: true }));
        toast.success('Answer submitted!');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex: number, value: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: parseInt(value)
    }));
  };

  const nextQuestion = () => {
    if (activePoll && currentQuestion < activePoll.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  if (!activePoll) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            MUS 240 Live Poll
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="space-y-4">
            <Timer className="h-16 w-16 text-gray-400 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-700">No Active Poll</h3>
            <p className="text-gray-500">
              Waiting for your instructor to start a poll...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuestionData = activePoll.questions[currentQuestion];
  const isAnswered = submittedAnswers[currentQuestion];
  const selectedAnswer = selectedAnswers[currentQuestion];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Student Name Input */}
      {false && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Your Name</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Your name..."
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && setStudentName(studentName.trim())}
            />
          </CardContent>
        </Card>
      )}

      {/* Poll Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{activePoll.title}</span>
            <span className="text-sm font-normal text-gray-500">
              Question {currentQuestion + 1} of {activePoll.questions.length}
            </span>
          </CardTitle>
          {activePoll.description && (
            <p className="text-gray-600">{activePoll.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {currentQuestionData.question}
            </h3>

            {/* Audio Player for Audio Questions */}
            {currentQuestionData.audio_url && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-3 w-3 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="text-blue-800 font-medium">Audio Question - Listen carefully</span>
                </div>
                <audio 
                  controls 
                  className="w-full"
                  preload="metadata"
                >
                  <source src={currentQuestionData.audio_url} type="audio/mpeg" />
                  <source src={currentQuestionData.audio_url} type="audio/wav" />
                  <source src={currentQuestionData.audio_url} type="audio/ogg" />
                  Your browser does not support the audio element.
                </audio>
                <p className="text-sm text-blue-700 mt-2">
                  💡 You can replay the audio as many times as needed
                </p>
              </div>
            )}

            {/* Answer Options */}
            <RadioGroup
              value={selectedAnswer?.toString()}
              onValueChange={(value) => handleAnswerChange(currentQuestion, value)}
              disabled={isAnswered}
              className="space-y-3"
            >
              {currentQuestionData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={index.toString()} 
                    id={`option-${index}`}
                    disabled={isAnswered}
                  />
                  <Label 
                    htmlFor={`option-${index}`}
                    className={`flex-1 cursor-pointer ${isAnswered ? 'text-gray-500' : ''}`}
                  >
                    {option}
                  </Label>
                  {isAnswered && selectedAnswer === index && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Submit Button */}
          {!isAnswered && (
            <Button
              onClick={() => submitAnswer(currentQuestion, selectedAnswer)}
              disabled={loading || selectedAnswer === undefined}
              className="w-full"
            >
              {loading ? 'Submitting...' : 'Submit Answer'}
            </Button>
          )}

          {isAnswered && (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">Answer submitted!</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevQuestion}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={nextQuestion}
              disabled={currentQuestion === activePoll.questions.length - 1}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};