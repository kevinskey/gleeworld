import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Clock, Music, CheckCircle, AlertCircle, Play, Pause } from 'lucide-react';
import { MusicalNotation, MUSICAL_SYMBOLS } from '@/components/ui/musical-notation';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  section: string;
  type: 'multiple-choice' | 'fill-blank' | 'staff-input' | 'drag-drop' | 'short-answer' | 'essay' | 'audio';
  question: string;
  points: number;
  options?: string[];
  correctAnswer?: string | string[];
  audioUrl?: string;
  staffType?: 'treble' | 'bass';
}

interface ExamState {
  currentSection: number;
  answers: Record<string, string | string[]>;
  timeRemaining: number;
  isStarted: boolean;
  isSubmitted: boolean;
  currentQuestionIndex: number;
}

const EXAM_QUESTIONS: Question[] = [
  // Section 1: Notation and Basics (20 pts)
  {
    id: '1-1',
    section: 'Section 1: Notation and Basics',
    type: 'staff-input',
    question: 'Write the C major scale ascending in treble clef.',
    points: 4,
    staffType: 'treble'
  },
  {
    id: '1-2',
    section: 'Section 1: Notation and Basics',
    type: 'multiple-choice',
    question: 'Identify the note shown on the second line of the bass clef staff:',
    points: 4,
    options: ['G', 'B', 'D', 'F'],
    correctAnswer: 'B'
  },
  {
    id: '1-3',
    section: 'Section 1: Notation and Basics',
    type: 'fill-blank',
    question: 'Define: A _______ is a vertical line that divides music into equal sections.',
    points: 4,
    correctAnswer: 'barline'
  },
  {
    id: '1-4',
    section: 'Section 1: Notation and Basics',
    type: 'fill-blank',
    question: 'A _______ is the smallest distance between two notes.',
    points: 4,
    correctAnswer: 'half step'
  },
  {
    id: '1-5',
    section: 'Section 1: Notation and Basics',
    type: 'multiple-choice',
    question: 'Select the correct key signature for G major:',
    points: 4,
    options: ['One sharp (F♯)', 'One flat (B♭)', 'Two sharps (F♯, C♯)', 'No sharps or flats'],
    correctAnswer: 'One sharp (F♯)'
  },

  // Section 2: Rhythm and Meter (20 pts)
  {
    id: '2-1',
    section: 'Section 2: Rhythm and Meter',
    type: 'staff-input',
    question: 'Recreate this rhythm pattern:',
    points: 5,
    staffType: 'treble'
  },
  {
    id: '2-2',
    section: 'Section 2: Rhythm and Meter',
    type: 'staff-input',
    question: 'Convert this 4/4 rhythm to 2/2 (cut time): Quarter, Quarter, Half',
    points: 5,
    staffType: 'treble'
  },
  {
    id: '2-3',
    section: 'Section 2: Rhythm and Meter',
    type: 'drag-drop',
    question: 'Fill in the missing note value to complete this 3/4 measure: Quarter note + _____ = 3/4',
    points: 5,
    options: ['Half note', 'Quarter note', 'Eighth note', 'Whole note'],
    correctAnswer: 'Half note'
  },
  {
    id: '2-4',
    section: 'Section 2: Rhythm and Meter',
    type: 'short-answer',
    question: 'Explain the difference between simple and compound meter, providing one example of each.',
    points: 5
  },

  // Section 3: Scales, Intervals, Chords (25 pts)
  {
    id: '3-1',
    section: 'Section 3: Scales, Intervals, Chords',
    type: 'staff-input',
    question: 'Write the A natural minor scale ascending.',
    points: 5,
    staffType: 'treble'
  },
  {
    id: '3-2',
    section: 'Section 3: Scales, Intervals, Chords',
    type: 'multiple-choice',
    question: 'Identify the interval from C to E:',
    points: 5,
    options: ['Major 2nd', 'Minor 3rd', 'Major 3rd', 'Perfect 4th'],
    correctAnswer: 'Major 3rd'
  },
  {
    id: '3-3',
    section: 'Section 3: Scales, Intervals, Chords',
    type: 'staff-input',
    question: 'Build a D major triad.',
    points: 5,
    staffType: 'treble'
  },
  {
    id: '3-4',
    section: 'Section 3: Scales, Intervals, Chords',
    type: 'multiple-choice',
    question: 'The chord C-E-G is what quality?',
    points: 5,
    options: ['Major', 'Minor', 'Diminished', 'Augmented'],
    correctAnswer: 'Major'
  },
  {
    id: '3-5',
    section: 'Section 3: Scales, Intervals, Chords',
    type: 'short-answer',
    question: 'Explain the difference between leading tone and subtonic in minor scales.',
    points: 5
  },

  // Section 4: Listening Identification (20 pts)
  {
    id: '4-1',
    section: 'Section 4: Listening Identification',
    type: 'audio',
    question: 'Listen to this excerpt. Is this duple or triple meter?',
    points: 5,
    audioUrl: '/audio/meter-example-1.mp3',
    options: ['Duple meter', 'Triple meter'],
    correctAnswer: 'Duple meter'
  },
  {
    id: '4-2',
    section: 'Section 4: Listening Identification',
    type: 'audio',
    question: 'Listen to this melody. Does it primarily move by steps or leaps?',
    points: 5,
    audioUrl: '/audio/melody-example-1.mp3',
    options: ['Primarily steps', 'Primarily leaps', 'Equal mix'],
    correctAnswer: 'Primarily steps'
  },
  {
    id: '4-3',
    section: 'Section 4: Listening Identification',
    type: 'audio',
    question: 'Is this excerpt in major or minor?',
    points: 5,
    audioUrl: '/audio/tonality-example-1.mp3',
    options: ['Major', 'Minor'],
    correctAnswer: 'Minor'
  },
  {
    id: '4-4',
    section: 'Section 4: Listening Identification',
    type: 'audio',
    question: 'Identify the cadence type in this excerpt.',
    points: 5,
    audioUrl: '/audio/cadence-example-1.mp3',
    options: ['Authentic', 'Half', 'Plagal', 'Deceptive'],
    correctAnswer: 'Authentic'
  },

  // Section 5: Applied + Cultural Context (15 pts)
  {
    id: '5-1',
    section: 'Section 5: Applied + Cultural Context',
    type: 'essay',
    question: 'Why did major/minor tonality dominate Western music after 1600? (150 words max)',
    points: 5
  },
  {
    id: '5-2',
    section: 'Section 5: Applied + Cultural Context',
    type: 'essay',
    question: 'Describe how African American rhythmic traditions shaped jazz and gospel music. (150 words max)',
    points: 5
  },
  {
    id: '5-3',
    section: 'Section 5: Applied + Cultural Context',
    type: 'staff-input',
    question: 'Compose a 4-measure melody in C major, 4/4 time.',
    points: 5,
    staffType: 'treble'
  }
];

const EXAM_DURATION = 90; // 90 minutes in seconds for testing (real would be 5400)

export const SMUS100MidtermExam: React.FC = () => {
  const { toast } = useToast();
  const [examState, setExamState] = useState<ExamState>({
    currentSection: 0,
    answers: {},
    timeRemaining: EXAM_DURATION,
    isStarted: false,
    isSubmitted: false,
    currentQuestionIndex: 0
  });

  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);

  // Timer effect
  useEffect(() => {
    if (!examState.isStarted || examState.isSubmitted) return;

    const timer = setInterval(() => {
      setExamState(prev => {
        if (prev.timeRemaining <= 1) {
          // Auto-submit when time runs out
          handleSubmitExam();
          return { ...prev, timeRemaining: 0, isSubmitted: true };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examState.isStarted, examState.isSubmitted]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startExam = () => {
    setExamState(prev => ({ ...prev, isStarted: true }));
    toast({
      title: "Exam Started",
      description: "You have 90 minutes to complete the SMUS-100 Midterm Exam. Good luck!",
    });
  };

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setExamState(prev => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer }
    }));
  };

  const handleSubmitExam = () => {
    setExamState(prev => ({ ...prev, isSubmitted: true }));
    toast({
      title: "Exam Submitted",
      description: "Your answers have been recorded. Results will be available after grading.",
    });
  };

  const playAudio = (questionId: string, audioUrl?: string) => {
    if (!audioUrl) return;
    
    if (audioPlaying === questionId) {
      setAudioPlaying(null);
      // In real implementation, pause audio
    } else {
      setAudioPlaying(questionId);
      // In real implementation, play audio
      toast({
        title: "Audio Playing",
        description: "Listen carefully to the musical excerpt.",
      });
    }
  };

  const getCurrentSection = () => {
    const question = EXAM_QUESTIONS[examState.currentQuestionIndex];
    return question?.section || 'Unknown Section';
  };

  const getProgress = () => {
    return ((examState.currentQuestionIndex + 1) / EXAM_QUESTIONS.length) * 100;
  };

  const nextQuestion = () => {
    if (examState.currentQuestionIndex < EXAM_QUESTIONS.length - 1) {
      setExamState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    }
  };

  const previousQuestion = () => {
    if (examState.currentQuestionIndex > 0) {
      setExamState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1 }));
    }
  };

  const renderQuestion = (question: Question) => {
    const answer = examState.answers[question.id] || '';

    switch (question.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-4">
            {/* Add musical notation examples for specific questions */}
            {question.id === '1-2' && (
              <div className="bg-muted/10 p-4 rounded-lg">
                <div className="text-center">
                  <MusicalNotation 
                    type="staff" 
                    clef="bass"
                    notes={[MUSICAL_SYMBOLS.quarterNote]}
                    className="mx-auto"
                  />
                  <p className="text-sm text-muted-foreground mt-2">Note on second line of bass clef</p>
                </div>
              </div>
            )}
            {question.id === '1-5' && (
              <div className="bg-muted/10 p-4 rounded-lg grid grid-cols-2 gap-4">
                <div className="text-center">
                  <MusicalNotation 
                    type="key-signature" 
                    clef="treble"
                    keySignature="G major"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Option A</p>
                </div>
                <div className="text-center">
                  <MusicalNotation 
                    type="key-signature" 
                    clef="treble"
                    keySignature="F major"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Option B</p>
                </div>
              </div>
            )}
            {question.id === '3-2' && (
              <div className="bg-muted/10 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-mono">C — E</div>
                  <p className="text-sm text-muted-foreground mt-2">Interval example</p>
                </div>
              </div>
            )}
            <RadioGroup
              value={answer as string}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
              className="space-y-2"
            >
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                  <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'fill-blank':
        return (
          <Input
            value={answer as string}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Type your answer..."
            className="max-w-md"
          />
        );

      case 'staff-input':
        return (
          <div className="space-y-4">
            {/* Add rhythm examples for specific questions */}
            {question.id === '2-1' && (
              <div className="bg-muted/10 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-3xl font-serif mb-2">
                    {MUSICAL_SYMBOLS.quarterNote} {MUSICAL_SYMBOLS.quarterRest} {MUSICAL_SYMBOLS.eighthNote}{MUSICAL_SYMBOLS.eighthNote} {MUSICAL_SYMBOLS.halfNote}
                  </div>
                  <p className="text-sm text-muted-foreground">Rhythm pattern to recreate</p>
                </div>
              </div>
            )}
            <MusicalNotation 
              type="staff" 
              clef={question.staffType}
              className="bg-background border rounded-lg p-4"
            />
            <Textarea
              value={answer as string}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Describe your notation or use text representation (e.g., C D E F G A B C)..."
              className="min-h-16"
            />
          </div>
        );

      case 'drag-drop':
        return (
          <div className="space-y-4">
            {question.id === '2-3' && (
              <div className="bg-muted/10 p-4 rounded-lg">
                <div className="text-center text-xl">
                  <span className="mr-4">{MUSICAL_SYMBOLS.quarterNote}</span>
                  <span className="text-muted-foreground mr-4">+</span>
                  <span className="text-muted-foreground mr-4">____</span>
                  <span className="text-muted-foreground mr-4">=</span>
                  <span>3/4</span>
                </div>
                <p className="text-sm text-muted-foreground text-center mt-2">Complete the measure</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {question.options?.map((option, index) => (
                <Button
                  key={index}
                  variant={answer === option ? "default" : "outline"}
                  onClick={() => handleAnswerChange(question.id, option)}
                  className="h-auto p-4 text-left"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'short-answer':
        return (
          <Textarea
            value={answer as string}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Type your answer (2-3 sentences)..."
            className="min-h-24"
          />
        );

      case 'essay':
        return (
          <div className="space-y-2">
            <Textarea
              value={answer as string}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Type your essay response..."
              className="min-h-32"
            />
            <div className="text-xs text-muted-foreground text-right">
              {(answer as string).length}/150 words max
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-4">
            <div className="bg-muted/20 p-4 rounded-lg border-2 border-dashed border-muted-foreground/20">
              <Button
                variant="outline"
                onClick={() => playAudio(question.id, question.audioUrl)}
                className="w-full"
              >
                {audioPlaying === question.id ? (
                  <><Pause className="w-4 h-4 mr-2" /> Pause Audio</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" /> Play Audio Excerpt</>
                )}
              </Button>
            </div>
            <RadioGroup
              value={answer as string}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
              className="space-y-2"
            >
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                  <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      default:
        return <div>Question type not implemented</div>;
    }
  };

  if (!examState.isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Music className="w-6 h-6" />
              SMUS-100 Midterm Exam
            </CardTitle>
            <p className="text-muted-foreground">Music Fundamentals – Timed Assessment</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/20 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Exam Instructions:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Duration: 90 minutes</li>
                <li>• Total Points: 100</li>
                <li>• Mixed format: Auto-graded and instructor-graded sections</li>
                <li>• You may navigate between questions</li>
                <li>• Audio excerpts are included in Section 4</li>
                <li>• Submit before time expires</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Section Breakdown:</h4>
                <div className="text-muted-foreground space-y-1">
                  <div>Section 1: Notation & Basics (20 pts)</div>
                  <div>Section 2: Rhythm & Meter (20 pts)</div>
                  <div>Section 3: Scales & Chords (25 pts)</div>
                  <div>Section 4: Listening (20 pts)</div>
                  <div>Section 5: Cultural Context (15 pts)</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Question Types:</h4>
                <div className="text-muted-foreground space-y-1">
                  <div>Multiple Choice</div>
                  <div>Fill in the Blank</div>
                  <div>Staff Notation</div>
                  <div>Audio Identification</div>
                  <div>Short Answer & Essays</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Button onClick={startExam} size="lg" className="px-8">
                <Clock className="w-4 h-4 mr-2" />
                Start Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examState.isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Exam Submitted Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700">
                Your SMUS-100 Midterm Exam has been submitted and recorded.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">What happens next?</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Auto-graded sections will be scored immediately</p>
                <p>• Instructor-graded sections will be reviewed within 3-5 business days</p>
                <p>• You will receive an email notification when results are available</p>
                <p>• Detailed feedback will be provided for essay questions</p>
              </div>
            </div>

            <div className="pt-4">
              <Badge variant="outline" className="text-sm">
                Submission Time: {new Date().toLocaleString()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = EXAM_QUESTIONS[examState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Exam Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                <h1 className="text-xl font-bold">SMUS-100 Midterm Exam</h1>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={examState.timeRemaining < 300 ? "destructive" : "outline"}>
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(examState.timeRemaining)}
                </Badge>
                {examState.timeRemaining < 300 && (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Question {examState.currentQuestionIndex + 1} of {EXAM_QUESTIONS.length}</span>
                <span>{getCurrentSection()}</span>
              </div>
              <Progress value={getProgress()} className="h-2" />
            </div>
          </CardHeader>
        </Card>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg mb-2">
                  {currentQuestion.question}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {currentQuestion.points} points
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderQuestion(currentQuestion)}
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={previousQuestion}
                disabled={examState.currentQuestionIndex === 0}
              >
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {examState.currentQuestionIndex === EXAM_QUESTIONS.length - 1 ? (
                  <Button onClick={handleSubmitExam} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Exam
                  </Button>
                ) : (
                  <Button onClick={nextQuestion}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};