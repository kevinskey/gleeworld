import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { YouTubeAudioPlayer } from './YouTubeAudioPlayer';
import { useTest } from '@/hooks/useTestBuilder';

interface StudentTestTakingProps {
  testId: string;
}

export const StudentTestTaking = ({ testId }: StudentTestTakingProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: testData, isLoading, error: loadError } = useTest(testId);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Initialize timer when test is loaded
  useEffect(() => {
    if (testData?.test?.duration_minutes && !hasStarted) {
      setTimeRemaining(testData.test.duration_minutes * 60);
    }
  }, [testData, hasStarted]);

  useEffect(() => {
    if (hasStarted && timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [hasStarted, timeRemaining]);

  // Extract test and questions from useTest hook with proper mapping
  const test = testData?.test;
  const questions = testData?.questions.map(question => {
    const normalizedType =
      question.question_type === 'multiple_choice'
        ? 'multiple-choice'
        : question.question_type === 'true_false'
        ? 'true-false'
        : question.question_type;

    const questionOptions = testData.options.filter(opt => opt.question_id === question.id);

    return {
      ...question,
      question_type: normalizedType,
      options: questionOptions || [],
      // Add cache-busting timestamp to audio URLs
      media_url: question.media_url && question.media_type === 'audio' 
        ? `${question.media_url}${question.media_url.includes('?') ? '&' : '?'}t=${Date.now()}`
        : question.media_url,
    };
  }) || [];

  const startTest = () => {
    setHasStarted(true);
  };

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Calculate score
      let totalScore = 0;
      const answerRecords = questions.map(q => {
        const userAnswer = answers[q.id] || '';
        // Check if answer is correct by comparing with options
        const correctOptions = q.options.filter(opt => opt.is_correct);
        const correctAnswers = correctOptions.map(opt => opt.option_text);
        
        let isCorrect = false;
        if (Array.isArray(userAnswer)) {
          // Multiple choice with multiple answers
          isCorrect = userAnswer.length === correctAnswers.length && 
                     userAnswer.every(ans => correctAnswers.includes(ans));
        } else {
          // Single answer (radio button or text)
          isCorrect = correctAnswers.includes(userAnswer as string);
        }
        
        if (isCorrect) {
          totalScore += q.points;
        }
        return {
          question_id: q.id,
          user_answer: typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer),
          is_correct: isCorrect,
          points_earned: isCorrect ? q.points : 0
        };
      });

      // Create submission
      const { data: submission, error: submissionError } = await supabase
        .from('test_submissions')
        .insert({
          test_id: testId,
          student_id: user.user.id,
          total_score: totalScore,
          passed: totalScore >= (test?.passing_score || 70),
          time_taken_seconds: test?.duration_minutes ? (test.duration_minutes * 60 - (timeRemaining || 0)) : null
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Save individual answers
      const { error: answersError } = await supabase
        .from('test_answers')
        .insert(
          answerRecords.map(a => ({
            submission_id: submission.id,
            ...a
          }))
        );

      if (answersError) throw answersError;

      toast({
        title: 'Test Submitted',
        description: `Score: ${totalScore}/${test?.total_points} (${Math.round((totalScore / (test?.total_points || 1)) * 100)}%)`
      });

      navigate(-1);
    } catch (error) {
      console.error('Error submitting test:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit test',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <p className="text-lg">Loading test...</p>
        </Card>
      </div>
    );
  }
  
  if (loadError || !testData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{loadError?.message || 'Failed to load test'}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (!test || !questions.length) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Test data not found</AlertDescription>
          </Alert>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-4">{test.title}</h1>
          {test.description && (
            <p className="text-muted-foreground mb-6">{test.description}</p>
          )}
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span>Duration: {test.duration_minutes} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Total Points: {test.total_points}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Passing Score: {test.passing_score}%</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Total Questions: {questions.length}</span>
            </div>
          </div>

          {test.instructions && (
            <Alert className="mb-6">
              <AlertDescription>{test.instructions}</AlertDescription>
            </Alert>
          )}

          <Button onClick={startTest} size="lg" className="w-full">
            Start Test
          </Button>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">{test.title}</h1>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5" />
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">
          Question {currentQuestion + 1} of {questions.length} • {answeredCount} answered
        </p>
      </div>

      <Card className="p-6 mb-6">
        <div className="mb-4">
          <span className="text-sm font-medium text-muted-foreground">
            Question {currentQuestion + 1}
          </span>
          <h2 className="text-xl font-semibold mt-2">{currentQ.question_text}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentQ.points} {currentQ.points === 1 ? 'point' : 'points'}
          </p>
        </div>

        {/* Media section */}
        {currentQ.youtube_video_id && (
          <div className="mb-6">
            <YouTubeAudioPlayer 
              videoId={currentQ.youtube_video_id}
              startTime={currentQ.start_time || undefined}
              endTime={currentQ.end_time || undefined}
            />
          </div>
        )}

        {currentQ.media_url && (currentQ.media_type === 'audio' || currentQ.media_type?.includes('audio')) && (
          <div className="mb-6">
            <Label className="text-sm font-medium mb-2 block">Audio</Label>
            <audio key={currentQ.media_url} controls className="w-full" controlsList="nodownload">
              <source src={currentQ.media_url} type="audio/mpeg" />
              <source src={currentQ.media_url} type="audio/wav" />
              <source src={currentQ.media_url} type="audio/mp3" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {currentQ.media_url && currentQ.media_type === 'image' && (
          <div className="mb-6">
            <img 
              src={currentQ.media_url} 
              alt={currentQ.media_title || "Question media"}
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        )}

        {currentQ.question_type === 'multiple-choice' || currentQ.question_type === 'true-false' ? (
          currentQ.options.filter((opt: any) => opt.is_correct).length > 1 ? (
            // Multiple correct answers - use checkboxes
            <div className="space-y-3">
              {currentQ.options?.map((option: any) => {
                const selectedAnswers = (answers[currentQ.id] as string[] | undefined) || [];
                const isChecked = selectedAnswers.includes(option.option_text);
                
                return (
                  <div
                    key={option.id}
                    className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent/50 cursor-pointer"
                    onClick={() => {
                      const currentSelected = (answers[currentQ.id] as string[] | undefined) || [];
                      const newSelected = isChecked
                        ? currentSelected.filter(text => text !== option.option_text)
                        : [...currentSelected, option.option_text];
                      handleAnswerChange(currentQ.id, newSelected);
                    }}
                  >
                    <Checkbox id={option.id} checked={isChecked} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.option_text}
                    </Label>
                  </div>
                );
              })}
            </div>
          ) : (
            // Single correct answer - use radio buttons
            <RadioGroup
              value={answers[currentQ.id] as string || ''}
              onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
            >
              {currentQ.options?.map((option: any) => (
                <div key={option.id} className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value={option.option_text} id={option.id} />
                  <Label htmlFor={option.id} className="cursor-pointer flex-1">
                    {option.option_text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )
        ) : (
          <Textarea
            value={answers[currentQ.id] || ''}
            onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
            placeholder="Type your answer here..."
            className="min-h-[150px]"
          />
        )}
      </Card>

      {/* Show unanswered questions when on last question */}
      {currentQuestion === questions.length - 1 && answeredCount < questions.length && (
        <Card className="p-6 mb-6 border-amber-500 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">
                Unanswered Questions ({questions.length - answeredCount})
              </h3>
              <p className="text-sm text-amber-800 mb-3">
                You still have unanswered questions. Click on a question number below to jump to it:
              </p>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, index) => {
                  const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                  if (!isAnswered) {
                    return (
                      <Button
                        key={q.id}
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentQuestion(index)}
                        className="border-amber-600 text-amber-900 hover:bg-amber-100"
                      >
                        Question {index + 1}
                      </Button>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || answeredCount < questions.length}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
