import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIGradeViewer } from '@/components/mus240/admin/AIGradeViewer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Bot, Save, User, Calendar, FileText, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { calculateLetterGrade } from '@/utils/grading';

interface JournalEntry {
  id: string;
  content: string;
  assignment_id: string;
  student_id: string;
  is_published: boolean;
  published_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  word_count: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  points: number;
  legacy_id: string;
}

interface StudentProfile {
  full_name: string;
  email: string;
}

interface Grade {
  id: string;
  overall_score: number;
  letter_grade: string;
  rubric: any;
  ai_feedback: string;
  instructor_score?: number;
  instructor_letter_grade?: string;
  instructor_feedback?: string;
  graded_at: string;
  instructor_graded_at?: string;
}

const JournalSubmissionGradingPage = () => {
  const { journal_id } = useParams<{ journal_id: string }>();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useUserRole();
  
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [instructorScore, setInstructorScore] = useState<number>(0);
  const [instructorFeedback, setInstructorFeedback] = useState<string>('');

  useEffect(() => {
    if (journal_id) {
      fetchJournalData();
    }
  }, [journal_id]);

  const fetchJournalData = async () => {
    try {
      setLoading(true);

      // Fetch journal entry
      const { data: journalData, error: journalError } = await supabase
        .from('mus240_journal_entries')
        .select('*')
        .eq('id', journal_id)
        .single();

      if (journalError) throw journalError;
      setJournal(journalData);

      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('gw_assignments')
        .select('*')
        .eq('legacy_id', journalData.assignment_id)
        .eq('legacy_source', 'mus240_assignments')
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      // Fetch student profile
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('full_name, email')
        .eq('user_id', journalData.student_id)
        .single();

      if (profileError) throw profileError;
      setStudent(profileData);

      // Fetch existing grade
      const { data: gradeData } = await supabase
        .from('mus240_journal_grades')
        .select('*')
        .eq('journal_id', journal_id)
        .order('graded_at', { ascending: false })
        .limit(1)
        .single();

      if (gradeData) {
        setGrade(gradeData);
        setInstructorScore(gradeData.instructor_score || gradeData.overall_score);
        setInstructorFeedback(gradeData.instructor_feedback || '');
      }

    } catch (error) {
      console.error('Error fetching journal data:', error);
      toast.error('Failed to load journal submission');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeWithAI = async () => {
    if (!journal || !assignment) return;

    try {
      setGrading(true);
      toast.info('AI is grading this submission...');

      const { data, error } = await supabase.functions.invoke('grade-journal-v2', {
        body: {
          journalId: journal.id,
          content: journal.content,
          prompt: assignment.description || '',
          maxPoints: assignment.points,
          assignmentId: assignment.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('AI grading complete!');
        await fetchJournalData(); // Refresh to show new grade
      } else {
        throw new Error(data.error || 'Grading failed');
      }

    } catch (error) {
      console.error('Error grading with AI:', error);
      toast.error('Failed to grade with AI');
    } finally {
      setGrading(false);
    }
  };

  const handleSaveInstructorGrade = async () => {
    if (!grade) {
      toast.error('No AI grade to update');
      return;
    }

    try {
      setSaving(true);

      const letterGrade = calculateLetterGrade(instructorScore, assignment?.points || 100);

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

      toast.success('Instructor grade saved!');
      await fetchJournalData();

    } catch (error) {
      console.error('Error saving instructor grade:', error);
      toast.error('Failed to save grade');
    } finally {
      setSaving(false);
    }
  };


  if (authLoading || loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading...</div>
        </div>
      </UniversalLayout>
    );
  }

  const isInstructor = profile?.role === 'instructor' || profile?.is_admin || profile?.is_super_admin;
  if (!isInstructor) {
    return <Navigate to="/mus-240" replace />;
  }

  if (!journal || !assignment || !student) {
    return (
      <UniversalLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p>Journal submission not found</p>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/classes/mus240/instructor/journals')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Badge variant={journal.is_published ? 'default' : 'secondary'}>
            {journal.is_published ? 'Published' : 'Draft'}
          </Badge>
        </div>

        {/* Assignment and Student Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {assignment.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{student.full_name}</span>
                <span className="text-muted-foreground">({student.email})</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Submitted: {journal.submitted_at ? format(new Date(journal.submitted_at), 'MMM dd, yyyy h:mm a') : 'Not submitted'}</span>
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Assignment Prompt:</p>
              <p className="text-sm text-muted-foreground">{assignment.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Student Submission */}
        <Card>
          <CardHeader>
            <CardTitle>Student Submission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none p-4 bg-muted rounded-lg">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{journal.content}</pre>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Word count: {journal.word_count}
            </div>
          </CardContent>
        </Card>

        {/* AI Grading Section */}
        {!grade ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <Bot className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">No AI Grade Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Grade this submission with AI to get detailed feedback and rubric scores
                  </p>
                  <Button onClick={handleGradeWithAI} disabled={grading} className="gap-2">
                    {grading ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        Grading...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4" />
                        Grade with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* AI Grade Display */}
            <AIGradeViewer
              journalId={journal.id}
              studentId={journal.student_id}
              assignmentId={assignment.id}
            />

            {/* Instructor Override */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Instructor Grade Override
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instructor-score">Score (out of {assignment.points})</Label>
                    <Input
                      id="instructor-score"
                      type="number"
                      min="0"
                      max={assignment.points}
                      value={instructorScore}
                      onChange={(e) => setInstructorScore(parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Letter Grade</Label>
                    <Input
                      value={calculateLetterGrade(instructorScore, assignment.points)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructor-feedback">Instructor Feedback</Label>
                  <Textarea
                    id="instructor-feedback"
                    placeholder="Add your feedback for the student..."
                    value={instructorFeedback}
                    onChange={(e) => setInstructorFeedback(e.target.value)}
                    rows={6}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button onClick={handleGradeWithAI} variant="outline" disabled={grading} className="gap-2">
                    <Bot className="h-4 w-4" />
                    Re-grade with AI
                  </Button>
                  <Button onClick={handleSaveInstructorGrade} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Grade'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </UniversalLayout>
  );
};

export default JournalSubmissionGradingPage;
