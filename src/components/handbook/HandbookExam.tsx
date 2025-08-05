import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, RefreshCw, BookOpen } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  section: string;
}

interface HandbookExamProps {
  onExamComplete: (passed: boolean, score: number, attempts: number) => void;
}

// Sample questions - in production, these would be AI-generated
const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 1,
    question: "What is the maximum number of unexcused absences allowed per semester?",
    options: ["1", "2", "3", "No limit"],
    correctAnswer: 1,
    section: "Attendance Policy"
  },
  {
    id: 2,
    question: "How many tardies equal one absence?",
    options: ["2", "3", "4", "5"],
    correctAnswer: 1,
    section: "Attendance Policy"
  },
  {
    id: 3,
    question: "What is required attire for Christmas Carol performances?",
    options: ["Black dress only", "Formal black dress, pearl necklace, teardrop earrings, red lipstick", "Any formal dress", "Concert black"],
    correctAnswer: 1,
    section: "Dress Code"
  },
  {
    id: 4,
    question: "Who is responsible for managing the Set-Up Crew?",
    options: ["President", "Set-Up Crew Manager", "Student Conductor", "Any Executive Board member"],
    correctAnswer: 1,
    section: "Executive Roles"
  },
  {
    id: 5,
    question: "What must first-year members do regarding seating on the tour bus?",
    options: ["Sit anywhere", "Sit in the front", "Sit in the rear", "Stand"],
    correctAnswer: 2,
    section: "Traditions"
  },
  {
    id: 6,
    question: "What percentage of the grade is based on Performances?",
    options: ["25%", "40%", "50%", "75%"],
    correctAnswer: 2,
    section: "Course Syllabus"
  },
  {
    id: 7,
    question: "How many sight-singing quizzes are required per week minimum?",
    options: ["1", "2", "3", "4"],
    correctAnswer: 1,
    section: "Course Syllabus"
  },
  {
    id: 8,
    question: "What happens if you arrive more than 15 minutes late to rehearsal?",
    options: ["Nothing", "Warning", "Counted as tardy", "Counted as absent"],
    correctAnswer: 3,
    section: "Attendance Policy"
  },
  {
    id: 9,
    question: "Who can excuse absences?",
    options: ["Any Executive Board member", "Only the President", "Dr. Johnson only", "President or Dr. Johnson"],
    correctAnswer: 3,
    section: "Attendance Policy"
  },
  {
    id: 10,
    question: "What is sung to thank the host after a tour concert?",
    options: ["Spelman Hymn", "Thank You Song", "Amazing Grace", "We Are Christmas"],
    correctAnswer: 1,
    section: "Traditions"
  },
  {
    id: 11,
    question: "What is Dr. Johnson's office location?",
    options: ["Fine Arts 103", "Fine Arts 105", "Music Building 201", "Manley Center"],
    correctAnswer: 1,
    section: "Course Information"
  },
  {
    id: 12,
    question: "Which role is responsible for organizing social events?",
    options: ["Vice President", "Social Chair", "Secretary", "Treasurer"],
    correctAnswer: 1,
    section: "Executive Roles"
  },
  {
    id: 13,
    question: "What minimum practice time is required for sight-reading practice per week?",
    options: ["15 minutes", "30 minutes", "45 minutes", "1 hour"],
    correctAnswer: 1,
    section: "Course Requirements"
  },
  {
    id: 14,
    question: "What must be submitted via Flipgrid?",
    options: ["Attendance records", "Final performance", "Practice logs", "Sheet music"],
    correctAnswer: 1,
    section: "Course Requirements"
  },
  {
    id: 15,
    question: "What grade range corresponds to an A?",
    options: ["90-100%", "93-100%", "95-100%", "85-100%"],
    correctAnswer: 2,
    section: "Grading Scale"
  }
];

export const HandbookExam: React.FC<HandbookExamProps> = ({ onExamComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [examStarted, setExamStarted] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [showResults, setShowResults] = useState(false);

  // Timer effect
  useEffect(() => {
    if (examStarted && !examCompleted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeRemaining === 0 && !examCompleted) {
      handleSubmitExam();
    }
  }, [examStarted, examCompleted, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartExam = () => {
    setExamStarted(true);
    setCurrentQuestion(0);
    setAnswers({});
    setExamCompleted(false);
    setScore(0);
    setShowResults(false);
    setTimeRemaining(1800);
    
    toast({
      title: "Exam Started",
      description: "You have 30 minutes to complete 15 questions. Good luck!",
    });
  };

  const handleAnswerSelect = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: parseInt(value)
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < SAMPLE_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmitExam = () => {
    // Calculate score
    let correctAnswers = 0;
    SAMPLE_QUESTIONS.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const finalScore = correctAnswers;
    const passed = finalScore === 15; // Must get 100%

    setScore(finalScore);
    setExamCompleted(true);
    setShowResults(true);

    // Save exam result (in a real app, this would save to database)
    const examResult = {
      user_id: user?.id,
      score: finalScore,
      total_questions: 15,
      attempt_number: attempts,
      passed,
      answers_data: answers,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem(`handbook_exam_${user?.id}`, JSON.stringify(examResult));

    onExamComplete(passed, finalScore, attempts);

    if (passed) {
      toast({
        title: "Congratulations! 🎉",
        description: "You passed the exam with 100%! You can now proceed to sign the contract.",
      });
    } else {
      toast({
        title: "Exam Not Passed",
        description: `You scored ${finalScore}/15. You need 15/15 to pass. Please review the handbook and try again.`,
        variant: "destructive",
      });
    }
  };

  const handleRetakeExam = () => {
    setAttempts(prev => prev + 1);
    setExamStarted(false);
    setExamCompleted(false);
    setShowResults(false);
    setCurrentQuestion(0);
    setAnswers({});
    setTimeRemaining(1800);
  };

  if (showResults) {
    const passed = score === 15;
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {passed ? <CheckCircle className="h-6 w-6 text-green-600" /> : <RefreshCw className="h-6 w-6 text-red-600" />}
            <span>Exam Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`${passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg p-6`}>
            <h3 className={`text-lg font-semibold mb-2 ${passed ? 'text-green-800' : 'text-red-800'}`}>
              {passed ? '🎉 Exam Passed!' : '❌ Exam Not Passed'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Score:</span> {score}/15
              </div>
              <div>
                <span className="font-medium">Percentage:</span> {Math.round((score / 15) * 100)}%
              </div>
              <div>
                <span className="font-medium">Attempt:</span> {attempts}
              </div>
              <div>
                <span className="font-medium">Required:</span> 15/15 (100%)
              </div>
            </div>
          </div>

          {!passed && attempts < 3 && (
            <div className="flex justify-center">
              <Button onClick={handleRetakeExam} className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4" />
                <span>Retake Exam (Attempt {attempts + 1})</span>
              </Button>
            </div>
          )}

          {!passed && attempts >= 3 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h4 className="font-semibold text-yellow-800 mb-2">Maximum Attempts Reached</h4>
              <p className="text-yellow-700">
                You have reached the maximum number of attempts (3). Please contact an Admin or Historian for manual unlock.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!examStarted) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <span>📘 Handbook Comprehension Exam</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">🧠 Test Overview</h3>
            <ul className="space-y-2 text-blue-700">
              <li>• 15 questions generated from the 2025–2026 SCGC Handbook</li>
              <li>• You must earn a <strong>100% score</strong> to proceed to the signature page</li>
              <li>• Multiple-choice and true/false questions from all handbook sections</li>
              <li>• 30-minute time limit</li>
              <li>• Maximum 3 attempts before requiring admin unlock</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h4 className="font-semibold text-yellow-800 mb-2">✅ Instructions</h4>
            <ol className="space-y-1 text-yellow-700">
              <li>1. Click "Start Handbook Exam" below</li>
              <li>2. Complete the 15-question assessment within 30 minutes</li>
              <li>3. Once you score 100%, you'll proceed to the Contract Agreement section</li>
              <li>4. If your score is below 100%, review the missed sections and retake</li>
            </ol>
          </div>

          <div className="flex justify-center">
            <Button onClick={handleStartExam} size="lg" className="px-8 py-3">
              Start Handbook Exam
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQ = SAMPLE_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / SAMPLE_QUESTIONS.length) * 100;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Question {currentQuestion + 1} of {SAMPLE_QUESTIONS.length}</span>
          <div className="flex items-center space-x-4">
            <Clock className="h-5 w-5" />
            <span className="text-lg font-mono">{formatTime(timeRemaining)}</span>
          </div>
        </CardTitle>
        <Progress value={progress} className="w-full" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-2">Section: {currentQ.section}</div>
          <h3 className="text-lg font-semibold">{currentQ.question}</h3>
        </div>

        <RadioGroup
          value={answers[currentQuestion]?.toString() || ""}
          onValueChange={handleAnswerSelect}
        >
          {currentQ.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={index.toString()} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`} className="cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex justify-between items-center pt-6">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          <div className="text-sm text-gray-600">
            {Object.keys(answers).length} of {SAMPLE_QUESTIONS.length} answered
          </div>

          {currentQuestion < SAMPLE_QUESTIONS.length - 1 ? (
            <Button
              onClick={handleNextQuestion}
              disabled={answers[currentQuestion] === undefined}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmitExam}
              disabled={Object.keys(answers).length < SAMPLE_QUESTIONS.length}
              className="bg-green-600 hover:bg-green-700"
            >
              Submit Exam
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};