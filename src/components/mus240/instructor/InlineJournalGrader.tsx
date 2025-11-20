import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bot, User } from 'lucide-react';
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
}

interface GradeData {
  id: string;
  overall_score: number;
  letter_grade: string;
  rubric: any;
  ai_feedback?: string;
  instructor_feedback?: string;
  ai_model?: string;
  graded_by?: string;
  graded_at: string;
  ai_writing_detected?: boolean;
  ai_detection_confidence?: number;
  ai_detection_reasoning?: string;
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
    
    setGrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('grade-journal', {
        body: {
          assignment_id: assignmentId,
          journal_id: journal.id
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

  if (loading) {
    return (
      <CardContent className="py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </CardContent>
    );
  }

  if (!journal) {
    return (
      <CardContent className="py-8">
        <div className="text-center text-muted-foreground">
          <p>No submission found for this student.</p>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="space-y-4 border-t pt-4">
      {/* Student Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="font-medium">{studentName}</span>
          {journal.is_published && (
            <Badge variant="outline" className="text-xs">Published</Badge>
          )}
        </div>
        {journal.submitted_at && (
          <span className="text-sm text-muted-foreground">
            Submitted {format(new Date(journal.submitted_at), 'MMM d, h:mm a')}
          </span>
        )}
      </div>

      {/* AI Detection Alert */}
      {grade?.ai_writing_detected && (
        <AIDetectionAlert
          detected={grade.ai_writing_detected}
          confidence={grade.ai_detection_confidence || 0}
          reasoning={grade.ai_detection_reasoning}
        />
      )}

      {/* Journal Content */}
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Student Writing</span>
          <span className="text-xs text-muted-foreground">{journal.word_count} words</span>
        </div>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-sm">{journal.content}</p>
        </div>
      </div>

      {/* Grade Display */}
      {grade ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Grade</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold">{grade.letter_grade}</span>
                  <span className="text-muted-foreground">({grade.overall_score}%)</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {grade.ai_model && (
                  <Badge variant="secondary" className="text-xs">
                    <Bot className="h-3 w-3 mr-1" />
                    AI Graded
                  </Badge>
                )}
                {grade.graded_by && (
                  <Badge variant="outline" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    Instructor Reviewed
                  </Badge>
                )}
              </div>
            </div>

            {/* Rubric Scores */}
            {grade.rubric && Array.isArray(grade.rubric) && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Rubric Breakdown</h5>
                {grade.rubric.map((criterion: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{criterion.criterion}</span>
                    <span className="font-medium">
                      {criterion.score}/{criterion.max_score}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Feedback */}
            {grade.ai_feedback && (
              <div className="space-y-1">
                <h5 className="text-sm font-medium">AI Feedback</h5>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {grade.ai_feedback}
                </p>
              </div>
            )}

            {grade.instructor_feedback && (
              <div className="space-y-1">
                <h5 className="text-sm font-medium">Instructor Feedback</h5>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {grade.instructor_feedback}
                </p>
              </div>
            )}

            <Button
              onClick={handleGradeWithAI}
              disabled={grading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Bot className="h-4 w-4 mr-2" />
              {grading ? 'Regrading...' : 'Regrade with AI'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Not yet graded</p>
          <Button
            onClick={handleGradeWithAI}
            disabled={grading}
            variant="default"
            size="sm"
          >
            <Bot className="h-4 w-4 mr-2" />
            {grading ? 'Grading...' : 'Grade with AI'}
          </Button>
        </div>
      )}
    </CardContent>
  );
};
