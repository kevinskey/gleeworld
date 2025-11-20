import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Bot, User, Edit, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AIDetectionAlert } from '../AIDetectionAlert';

interface InlineJournalGraderProps {
  assignmentId: string;
  assignmentCode: string;
  studentId: string;
  onClose?: () => void;
}

interface JournalEntry {
  id: string;
  content: string;
  word_count: number;
  is_published: boolean;
  submitted_at: string | null;
  student_id: string;
  resubmission_count?: number;
  is_resubmission?: boolean;
  original_submission_id?: string;
}

interface GradeData {
  id: string;
  overall_score: number;
  letter_grade: string;
  rubric: any;
  ai_feedback?: string;
  instructor_feedback?: string;
  instructor_score?: number;
  instructor_letter_grade?: string;
  ai_model?: string;
  graded_by?: string;
  graded_at: string;
  instructor_graded_at?: string;
  ai_writing_detected?: boolean;
  ai_detection_confidence?: number;
  ai_detection_notes?: string;
}

export const InlineJournalGrader: React.FC<InlineJournalGraderProps> = ({
  assignmentId,
  assignmentCode,
  studentId,
  onClose
}) => {
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [grade, setGrade] = useState<GradeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [showInstructorGrading, setShowInstructorGrading] = useState(false);
  const [instructorScore, setInstructorScore] = useState<number | null>(null);
  const [instructorFeedback, setInstructorFeedback] = useState('');
  const [savingFinalGrade, setSavingFinalGrade] = useState(false);

  useEffect(() => {
    fetchJournalAndGrade();
  }, [assignmentCode, studentId]);

  const fetchJournalAndGrade = async () => {
    setLoading(true);
    try {
      // Fetch student name
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('full_name')
        .eq('user_id', studentId)
        .single();
      
      if (profile) setStudentName(profile.full_name);

      // Fetch journal entry
      const { data: journalData, error: journalError } = await supabase
        .from('mus240_journal_entries')
        .select('*')
        .eq('assignment_id', assignmentCode)
        .eq('student_id', studentId)
        .maybeSingle();

      if (journalError && journalError.code !== 'PGRST116') throw journalError;
      
      if (!journalData) {
        setJournal(null);
        setLoading(false);
        return;
      }

      setJournal(journalData);

      // Fetch grade
      const { data: gradeData, error: gradeError } = await supabase
        .from('mus240_journal_grades')
        .select('*')
        .eq('journal_id', journalData.id)
        .maybeSingle();

      if (gradeError && gradeError.code !== 'PGRST116') throw gradeError;
      
      setGrade(gradeData);
    } catch (error) {
      console.error('Error fetching journal:', error);
      toast.error('Failed to load journal');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeWithAI = async () => {
    if (!journal) return;
    
    // Extract actual text content (skip attachment lines)
    const textContent = journal.content
      .split('\n')
      .filter(line => !line.startsWith('Attachment:') && !line.startsWith('https://'))
      .join('\n')
      .trim();
    
    console.log('Journal content processing:', {
      originalLength: journal.content.length,
      filteredLength: textContent.length,
      originalContent: journal.content.substring(0, 200),
      filteredContent: textContent.substring(0, 200)
    });
    
    if (!textContent) {
      toast.error('No text content found in journal entry. PDF-only submissions cannot be auto-graded.');
      return;
    }
    
    setGrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('grade-journal', {
        body: {
          assignment_id: assignmentId,
          journal_id: journal.id,
          journal_text: textContent,
          student_id: studentId
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Journal graded successfully');
        await fetchJournalAndGrade();
      } else {
        throw new Error(data?.error || 'Grading failed');
      }
    } catch (error: any) {
      console.error('Error grading journal:', error);
      toast.error(error.message || 'Failed to grade journal');
    } finally {
      setGrading(false);
    }
  };

  const handleSaveFinalGrade = async () => {
    if (!grade || instructorScore === null) return;
    
    setSavingFinalGrade(true);
    try {
      const letterGrade = getLetterGrade(instructorScore);
      
      const { error } = await supabase
        .from('mus240_journal_grades')
        .update({
          instructor_score: instructorScore,
          instructor_letter_grade: letterGrade,
          instructor_feedback: instructorFeedback,
          instructor_graded_at: new Date().toISOString()
        })
        .eq('id', grade.id);

      if (error) throw error;
      
      toast.success('Final grade saved successfully');
      setShowInstructorGrading(false);
      await fetchJournalAndGrade();
    } catch (error: any) {
      console.error('Error saving final grade:', error);
      toast.error(error.message || 'Failed to save final grade');
    } finally {
      setSavingFinalGrade(false);
    }
  };

  const getLetterGrade = (score: number): string => {
    if (score >= 16.5) return "A+";
    if (score >= 15.5) return "A";
    if (score >= 14.5) return "A-";
    if (score >= 13.5) return "B+";
    if (score >= 12.5) return "B";
    if (score >= 11.5) return "B-";
    if (score >= 10.5) return "C+";
    if (score >= 9.5) return "C";
    if (score >= 8.5) return "C-";
    if (score >= 7.5) return "D+";
    if (score >= 6.5) return "D";
    if (score >= 5.5) return "D-";
    return "F";
  };

  if (loading) {
    return (
      <CardContent className="py-8">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading journal...</span>
        </div>
      </CardContent>
    );
  }

  if (!journal) {
    return (
      <CardContent className="py-8">
        <p className="text-center text-muted-foreground">No journal entry found for this student.</p>
      </CardContent>
    );
  }

  const finalScore = grade?.instructor_score ?? grade?.overall_score;
  const finalLetterGrade = grade?.instructor_letter_grade ?? grade?.letter_grade;
  const isFinalGraded = !!grade?.instructor_score;
  const canStudentRevise = grade && !isFinalGraded && (journal.resubmission_count || 0) < 1;

  return (
    <div className="space-y-6 p-6 bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{studentName}'s Journal Entry</h3>
          <p className="text-sm text-muted-foreground">
            Submitted: {journal.submitted_at ? format(new Date(journal.submitted_at), 'MMM d, yyyy h:mm a') : 'Not submitted'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {journal.is_resubmission && (
            <Badge variant="outline" className="bg-blue-50">
              <Edit className="h-3 w-3 mr-1" />
              Revision {journal.resubmission_count || 1}
            </Badge>
          )}
          {finalScore !== undefined && (
            <Badge variant={isFinalGraded ? "default" : "secondary"} className="text-lg px-4 py-1">
              {isFinalGraded ? (
                <><Check className="h-4 w-4 mr-1" /> Final: {finalScore}/17 ({finalLetterGrade})</>
              ) : (
                <><Bot className="h-4 w-4 mr-1" /> AI: {finalScore}/17 ({finalLetterGrade})</>
              )}
            </Badge>
          )}
        </div>
      </div>

      {/* Revision Status */}
      {canStudentRevise && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Student can revise once</p>
                <p className="text-sm text-yellow-700">
                  After AI grading, students have one opportunity to revise and resubmit before final instructor grading.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Detection Alert */}
      {grade?.ai_writing_detected && (
        <AIDetectionAlert
          detected={grade.ai_writing_detected}
          confidence={grade.ai_detection_confidence}
          reasoning={grade.ai_detection_notes}
        />
      )}

      {/* Journal Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journal Entry ({journal.word_count} words)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{journal.content}</p>
          </div>
        </CardContent>
      </Card>

      {/* Grading Section */}
      {!grade ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">This journal has not been graded yet.</p>
            <Button onClick={handleGradeWithAI} disabled={grading}>
              {grading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Grading...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Grade with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Rubric Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rubric Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {grade.rubric?.scores?.map((score: any, idx: number) => (
                <div key={idx} className="border-b pb-3 last:border-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{score.criterion}</span>
                    <Badge variant="outline">{score.score}/{score.max_score}</Badge>
                  </div>
                  {score.feedback && (
                    <p className="text-sm text-muted-foreground mt-1">{score.feedback}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Feedback */}
          {grade.ai_feedback && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{grade.ai_feedback}</p>
              </CardContent>
            </Card>
          )}

          {/* Instructor Final Grading */}
          {!isFinalGraded && !showInstructorGrading && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">Ready for final instructor grading</p>
                    <p className="text-sm text-blue-700">
                      Provide final score and feedback to complete the grading process.
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      setShowInstructorGrading(true);
                      setInstructorScore(grade.overall_score);
                      setInstructorFeedback(grade.ai_feedback || '');
                    }}
                    variant="default"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Provide Final Grade
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showInstructorGrading && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Final Instructor Grade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="instructor-score">Final Score (out of 17)</Label>
                  <Input
                    id="instructor-score"
                    type="number"
                    min="0"
                    max="17"
                    step="0.5"
                    value={instructorScore ?? ''}
                    onChange={(e) => setInstructorScore(parseFloat(e.target.value) || null)}
                    className="max-w-xs"
                  />
                  {instructorScore !== null && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Letter Grade: {getLetterGrade(instructorScore)}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="instructor-feedback">Instructor Feedback</Label>
                  <Textarea
                    id="instructor-feedback"
                    value={instructorFeedback}
                    onChange={(e) => setInstructorFeedback(e.target.value)}
                    rows={6}
                    placeholder="Provide detailed feedback for the student..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveFinalGrade} 
                    disabled={savingFinalGrade || instructorScore === null}
                  >
                    {savingFinalGrade ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Final Grade
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowInstructorGrading(false)}
                    disabled={savingFinalGrade}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show Final Instructor Grade if exists */}
          {isFinalGraded && grade.instructor_feedback && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Final Instructor Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{grade.instructor_feedback}</p>
                {grade.instructor_graded_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Graded: {format(new Date(grade.instructor_graded_at), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Regrade Option */}
          {!isFinalGraded && (
            <div className="flex justify-end">
              <Button onClick={handleGradeWithAI} disabled={grading} variant="outline">
                {grading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Regrading...
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4 mr-2" />
                    Regrade with AI
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
