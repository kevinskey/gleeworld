import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, Save, Send, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMus240MidtermSubmissions } from '@/hooks/useMus240MidtermSubmissions';
import { useTestAnalytics } from '@/hooks/useTestAnalytics';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { YouTubeExamPlayer } from '@/components/mus240/YouTubeExamPlayer';

interface ExamFormData {
  selectedTerms: string[];
  termAnswers: Record<string, string>;
  excerpt1Genre: string;
  excerpt1Features: string;
  excerpt1Context: string;
  excerpt2Genre: string;
  excerpt2Features: string;
  excerpt2Context: string;
  excerpt3Genre: string;
  excerpt3Features: string;
  excerpt3Context: string;
  selectedEssayQuestion: number | null;
  essayAnswer: string;
}

const terms = [
  'ring_shout',
  'field_holler', 
  'negro_spiritual',
  'blues',
  'ragtime',
  'swing'
];

const termLabels = {
  ring_shout: 'Ring shout',
  field_holler: 'Field holler',
  negro_spiritual: 'Negro spiritual',
  blues: 'Blues',
  ragtime: 'Ragtime',
  swing: 'Swing'
};

const essayQuestions = [
  'Trace how one early form (ring shout, field holler, or spiritual) influenced later styles (blues, jazz, swing).',
  'Explain how technology (sheet music, race records, radio) shaped the spread of African American music between 1890 and 1940.',
  'Compare sacred and secular functions of two genres we studied.'
];

export const MidtermExamForm: React.FC = () => {
  const { submission, isLoading, saveProgress, submitExam, resetExam, isSaving, isSubmitting, isResetting } = useMus240MidtermSubmissions();
  const analytics = useTestAnalytics(submission?.id || null, submission?.user_id || null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const TIME_LIMIT = 50; // minutes
  const [formData, setFormData] = useState<ExamFormData>({
    selectedTerms: [],
    termAnswers: {},
    excerpt1Genre: '',
    excerpt1Features: '',
    excerpt1Context: '',
    excerpt2Genre: '',
    excerpt2Features: '',
    excerpt2Context: '',
    excerpt3Genre: '',
    excerpt3Features: '',
    excerpt3Context: '',
    selectedEssayQuestion: null,
    essayAnswer: ''
  });

  // Use ref to always have latest formData without triggering effect re-runs
  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Track if initial data has been loaded to prevent resets during exam
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Prevent browser navigation (refresh, close tab, etc.)
  useEffect(() => {
    if (submission && !submission.is_submitted) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'You have an exam in progress. Your answers are auto-saved every 30 seconds. Are you sure you want to leave?';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [submission?.is_submitted]);

  // Load existing submission data ONLY ONCE when exam first loads
  useEffect(() => {
    if (submission && !submission.is_submitted && !initialDataLoaded) {
      console.log('Initial load of submission data:', submission.id);
      setFormData({
        selectedTerms: submission.selected_terms || [],
        termAnswers: {
          ring_shout: submission.ring_shout_answer || '',
          field_holler: submission.field_holler_answer || '',
          negro_spiritual: submission.negro_spiritual_answer || '',
          blues: submission.blues_answer || '',
          ragtime: submission.ragtime_answer || '',
          swing: submission.swing_answer || ''
        },
        excerpt1Genre: submission.excerpt_1_genre || '',
        excerpt1Features: submission.excerpt_1_features || '',
        excerpt1Context: submission.excerpt_1_context || '',
        excerpt2Genre: submission.excerpt_2_genre || '',
        excerpt2Features: submission.excerpt_2_features || '',
        excerpt2Context: submission.excerpt_2_context || '',
        excerpt3Genre: submission.excerpt_3_genre || '',
        excerpt3Features: submission.excerpt_3_features || '',
        excerpt3Context: submission.excerpt_3_context || '',
        selectedEssayQuestion: submission.selected_essay_question || null,
        essayAnswer: submission.essay_answer || ''
      });
      setInitialDataLoaded(true);
    }
  }, [submission?.id, submission?.is_submitted, initialDataLoaded]);

  // Timer effect with auto-submit
  useEffect(() => {
    if (submission && !submission.is_submitted) {
      const startTime = new Date(submission.time_started);
      const timer = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
        setTimeElapsed(elapsed);

        // Show 10-minute warning
        if (elapsed === TIME_LIMIT - 10 && !showWarning) {
          setWarningMessage('10 minutes remaining! Your exam will auto-submit when time expires.');
          setShowWarning(true);
        }

        // Show 5-minute warning
        if (elapsed === TIME_LIMIT - 5) {
          setWarningMessage('5 minutes remaining! Your exam will auto-submit soon.');
          setShowWarning(true);
        }

        // Auto-submit when time expires
        if (elapsed >= TIME_LIMIT) {
          clearInterval(timer);
          handleAutoSubmit();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [submission, showWarning]);

  const handleAutoSubmit = () => {
    const submissionData = {
      selected_terms: formData.selectedTerms,
      ring_shout_answer: formData.termAnswers.ring_shout || null,
      field_holler_answer: formData.termAnswers.field_holler || null,
      negro_spiritual_answer: formData.termAnswers.negro_spiritual || null,
      blues_answer: formData.termAnswers.blues || null,
      ragtime_answer: formData.termAnswers.ragtime || null,
      swing_answer: formData.termAnswers.swing || null,
      excerpt_1_genre: formData.excerpt1Genre || null,
      excerpt_1_features: formData.excerpt1Features || null,
      excerpt_1_context: formData.excerpt1Context || null,
      excerpt_2_genre: formData.excerpt2Genre || null,
      excerpt_2_features: formData.excerpt2Features || null,
      excerpt_2_context: formData.excerpt2Context || null,
      excerpt_3_genre: formData.excerpt3Genre || null,
      excerpt_3_features: formData.excerpt3Features || null,
      excerpt_3_context: formData.excerpt3Context || null,
      selected_essay_question: formData.selectedEssayQuestion || null,
      essay_answer: formData.essayAnswer || null,
    };
    
    submitExam(submissionData);
  };

  const handleTermSelection = (term: string, checked: boolean) => {
    setFormData(prev => {
      const newSelectedTerms = checked 
        ? [...prev.selectedTerms, term]
        : prev.selectedTerms.filter(t => t !== term);
      
      // Limit to 3 terms
      if (newSelectedTerms.length > 3) {
        return prev;
      }
      
      return { ...prev, selectedTerms: newSelectedTerms };
    });
  };

  const handleTermAnswer = (term: string, answer: string) => {
    setFormData(prev => ({
      ...prev,
      termAnswers: { ...prev.termAnswers, [term]: answer }
    }));
  };

  const handleAutoSave = useCallback(() => {
    const currentFormData = formDataRef.current;
    const submissionData = {
      selected_terms: currentFormData.selectedTerms,
      ring_shout_answer: currentFormData.termAnswers.ring_shout || null,
      field_holler_answer: currentFormData.termAnswers.field_holler || null,
      negro_spiritual_answer: currentFormData.termAnswers.negro_spiritual || null,
      blues_answer: currentFormData.termAnswers.blues || null,
      ragtime_answer: currentFormData.termAnswers.ragtime || null,
      swing_answer: currentFormData.termAnswers.swing || null,
      excerpt_1_genre: currentFormData.excerpt1Genre || null,
      excerpt_1_features: currentFormData.excerpt1Features || null,
      excerpt_1_context: currentFormData.excerpt1Context || null,
      excerpt_2_genre: currentFormData.excerpt2Genre || null,
      excerpt_2_features: currentFormData.excerpt2Features || null,
      excerpt_2_context: currentFormData.excerpt2Context || null,
      excerpt_3_genre: currentFormData.excerpt3Genre || null,
      excerpt_3_features: currentFormData.excerpt3Features || null,
      excerpt_3_context: currentFormData.excerpt3Context || null,
      selected_essay_question: currentFormData.selectedEssayQuestion || null,
      essay_answer: currentFormData.essayAnswer || null,
    };
    
    saveProgress(submissionData);
  }, [saveProgress]);

  const handleSubmitExam = () => {
    const submissionData = {
      selected_terms: formData.selectedTerms,
      ring_shout_answer: formData.termAnswers.ring_shout || null,
      field_holler_answer: formData.termAnswers.field_holler || null,
      negro_spiritual_answer: formData.termAnswers.negro_spiritual || null,
      blues_answer: formData.termAnswers.blues || null,
      ragtime_answer: formData.termAnswers.ragtime || null,
      swing_answer: formData.termAnswers.swing || null,
      excerpt_1_genre: formData.excerpt1Genre || null,
      excerpt_1_features: formData.excerpt1Features || null,
      excerpt_1_context: formData.excerpt1Context || null,
      excerpt_2_genre: formData.excerpt2Genre || null,
      excerpt_2_features: formData.excerpt2Features || null,
      excerpt_2_context: formData.excerpt2Context || null,
      excerpt_3_genre: formData.excerpt3Genre || null,
      excerpt_3_features: formData.excerpt3Features || null,
      excerpt_3_context: formData.excerpt3Context || null,
      selected_essay_question: formData.selectedEssayQuestion || null,
      essay_answer: formData.essayAnswer || null,
    };
    
    submitExam(submissionData);
  };

  // Auto-save every 30 seconds - stable interval that always uses current formData
  useEffect(() => {
    if (submission && !submission.is_submitted) {
      console.log('Setting up auto-save interval', { submission: submission.id });
      const interval = setInterval(() => {
        console.log('Auto-save triggered');
        handleAutoSave();
      }, 30000);
      return () => {
        console.log('Clearing auto-save interval');
        clearInterval(interval);
      };
    }
  }, [submission?.id, submission?.is_submitted, handleAutoSave]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (submission?.is_submitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <Badge variant="secondary" className="text-green-700 bg-green-100">
              Submitted
            </Badge>
          </div>
          <h2 className="text-2xl font-bold mb-4">Exam Submitted Successfully</h2>
          <p className="text-slate-600 mb-4">
            Your midterm exam was submitted on {new Date(submission.submitted_at).toLocaleDateString()} 
            at {new Date(submission.submitted_at).toLocaleTimeString()}.
          </p>
          <p className="text-slate-600 mb-6">
            Total time: {submission.total_time_minutes} minutes
          </p>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isResetting}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                {isResetting ? 'Resetting...' : 'Retake Exam'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Retake Midterm Exam?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to retake this exam? Your previous submission will be overwritten when you submit the new attempt. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetExam}>
                  Yes, Retake Exam
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  const timeRemaining = TIME_LIMIT - timeElapsed;
  const isTimeRunningOut = timeRemaining <= 10;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Time Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Time Warning
            </AlertDialogTitle>
            <AlertDialogDescription>
              {warningMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarning(false)}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Timer and Controls */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className={`h-5 w-5 flex-shrink-0 ${isTimeRunningOut ? 'text-orange-600' : 'text-primary'}`} />
                <span className={`font-medium text-sm md:text-base ${isTimeRunningOut ? 'text-orange-600' : ''}`}>
                  Time Remaining: {timeRemaining} minutes
                </span>
              </div>
              {isSaving && (
                <Badge variant="outline" className="text-blue-600 text-xs md:text-sm">
                  Saving...
                </Badge>
              )}
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                onClick={handleAutoSave}
                disabled={isSaving}
                className="flex-1 md:flex-none"
              >
                <Save className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Save Progress</span>
                <span className="sm:hidden">Save</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="default"
                    disabled={isSubmitting}
                    className="flex-1 md:flex-none"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Submit Exam</span>
                    <span className="sm:hidden">Submit</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit your exam? This action cannot be undone and you will not be able to make any further changes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmitExam}>
                      Submit Exam
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Part I: Short Identifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">I</span>
            Part I: Short Identifications (40 points)
          </CardTitle>
          <p className="text-slate-600">
            Select and define <strong>three</strong> of the following six terms in 3–4 sentences. Include time period, musical features, and cultural role.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">
              Select 3 terms to define ({formData.selectedTerms.length}/3):
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {terms.map((term) => (
                <div key={term} className="flex items-center space-x-2">
                  <Checkbox
                    id={term}
                    checked={formData.selectedTerms.includes(term)}
                    onCheckedChange={(checked) => handleTermSelection(term, checked as boolean)}
                    disabled={!formData.selectedTerms.includes(term) && formData.selectedTerms.length >= 3}
                  />
                  <Label htmlFor={term} className="text-sm">
                    {termLabels[term as keyof typeof termLabels]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {formData.selectedTerms.map((term) => (
            <div key={term} className="space-y-2">
              <Label className="text-base font-medium">
                {termLabels[term as keyof typeof termLabels]}
              </Label>
              <Textarea
                placeholder="Define this term in 3-4 sentences, including time period, musical features, and cultural role..."
                value={formData.termAnswers[term] || ''}
                onChange={(e) => handleTermAnswer(term, e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* Part II: Listening Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">II</span>
            Part II: Listening/Analysis (30 points)
          </CardTitle>
          <p className="text-slate-600">
            You will hear three short excerpts from our class playlist. For each excerpt, identify the genre, point out two musical features, and connect to cultural/historical context.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Excerpt 1 */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-blue-900">Excerpt 1 (10 points)</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
              <Label className="text-sm font-medium mb-2 block">Listen to the Audio</Label>
              <audio controls className="w-full" preload="metadata">
                <source src="https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/course-materials/mus240/excerpts/excerpt1.wav" type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
              <p className="text-xs text-slate-600 mt-2">
                If audio doesn't play, please contact your instructor.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Genre</Label>
                <Textarea
                  placeholder="Identify the genre..."
                  value={formData.excerpt1Genre}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt1Genre: e.target.value }))}
                  className="min-h-[60px]"
                />
              </div>
              <div>
                <Label>Musical Features (form, rhythm, timbre, texture, harmony)</Label>
                <Textarea
                  placeholder="Point out two musical features..."
                  value={formData.excerpt1Features}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt1Features: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
              <div>
                <Label>Cultural/Historical Context</Label>
                <Textarea
                  placeholder="Connect the piece to its cultural or historical context..."
                  value={formData.excerpt1Context}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt1Context: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>

          {/* Excerpt 2 */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-purple-900">Excerpt 2 (10 points)</h4>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-3">
              <Label className="text-sm font-medium mb-2 block">Listen to the Audio</Label>
              <audio controls className="w-full" preload="metadata">
                <source src="https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/course-materials/mus240/excerpts/excerpt2.wav" type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
              <p className="text-xs text-slate-600 mt-2">
                If audio doesn't play, please contact your instructor.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Genre</Label>
                <Textarea
                  placeholder="Identify the genre..."
                  value={formData.excerpt2Genre}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt2Genre: e.target.value }))}
                  className="min-h-[60px]"
                />
              </div>
              <div>
                <Label>Musical Features (form, rhythm, timbre, texture, harmony)</Label>
                <Textarea
                  placeholder="Point out two musical features..."
                  value={formData.excerpt2Features}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt2Features: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
              <div>
                <Label>Cultural/Historical Context</Label>
                <Textarea
                  placeholder="Connect the piece to its cultural or historical context..."
                  value={formData.excerpt2Context}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt2Context: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>

          {/* Excerpt 3 */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-green-900">Excerpt 3 (10 points)</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
              <Label className="text-sm font-medium mb-2 block">Listen to the Audio</Label>
              <audio controls className="w-full" preload="metadata">
                <source src="https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/course-materials/mus240/excerpts/excerpt3.wav" type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
              <p className="text-xs text-slate-600 mt-2">
                If audio doesn't play, please contact your instructor.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Genre</Label>
                <Textarea
                  placeholder="Identify the genre..."
                  value={formData.excerpt3Genre}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt3Genre: e.target.value }))}
                  className="min-h-[60px]"
                />
              </div>
              <div>
                <Label>Musical Features (form, rhythm, timbre, texture, harmony)</Label>
                <Textarea
                  placeholder="Point out two musical features..."
                  value={formData.excerpt3Features}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt3Features: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
              <div>
                <Label>Cultural/Historical Context</Label>
                <Textarea
                  placeholder="Connect the piece to its cultural or historical context..."
                  value={formData.excerpt3Context}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt3Context: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Part III: Short Essay */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="bg-orange-100 text-orange-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">III</span>
            Part III: Short Essay (30 points)
          </CardTitle>
          <p className="text-slate-600">
            Answer <strong>one</strong> of the following in 1–2 well-organized paragraphs:
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={formData.selectedEssayQuestion?.toString()}
            onValueChange={(value) => setFormData(prev => ({ ...prev, selectedEssayQuestion: parseInt(value) }))}
          >
            {essayQuestions.map((question, index) => (
              <div key={index} className="flex items-start space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value={index.toString()} id={`essay-${index}`} className="mt-1" />
                <Label htmlFor={`essay-${index}`} className="text-sm leading-relaxed">
                  <span className="font-semibold">{index + 1}.</span> {question}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {formData.selectedEssayQuestion !== null && (
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Your Answer (1-2 well-organized paragraphs)
              </Label>
              <Textarea
                placeholder="Write your essay response here..."
                value={formData.essayAnswer}
                onChange={(e) => setFormData(prev => ({ ...prev, essayAnswer: e.target.value }))}
                className="min-h-[200px]"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};