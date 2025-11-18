import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, RefreshCcw, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';

interface JournalEntry {
  id: string;
  content: string;
  assignment_id: string;
  student_id: string;
  submitted_at: string;
  word_count: number;
  resubmission_count: number;
  is_resubmission: boolean;
}

interface Assignment {
  id: string;
  title: string;
  prompt: string;
  points: number;
}

interface Grade {
  overall_score: number;
  letter_grade: string;
  rubric: any;
  ai_feedback: string;
  ai_writing_detected: boolean;
  ai_detection_confidence: number | null;
  ai_detection_notes: string | null;
  graded_at: string;
}

export const StudentJournalGradePage = () => {
  const { journal_id } = useParams<{ journal_id: string }>();
  const navigate = useNavigate();
  const { profile } = useUserRole();
  
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [loading, setLoading] = useState(true);
  const [resubmitting, setResubmitting] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);
  const [resubmitContent, setResubmitContent] = useState('');

  useEffect(() => {
    if (journal_id && profile) {
      fetchJournalData();
    }
  }, [journal_id, profile]);

  const fetchJournalData = async () => {
    try {
      setLoading(true);

      // Fetch journal
      const { data: journalData, error: journalError } = await supabase
        .from('mus240_journal_entries')
        .select('*')
        .eq('id', journal_id)
        .single();

      if (journalError) throw journalError;
      
      // Verify this journal belongs to the current user
      if (journalData.student_id !== profile?.user_id) {
        toast.error('You do not have permission to view this journal');
        navigate('/classes/mus240/student/dashboard');
        return;
      }
      
      setJournal(journalData);
      setResubmitContent(journalData.content);

      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('mus240_assignments')
        .select('*')
        .eq('assignment_code', journalData.assignment_id)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      // Fetch grade
      const { data: gradeData, error: gradeError } = await supabase
        .from('mus240_journal_grades')
        .select('*')
        .eq('journal_id', journal_id)
        .order('graded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (gradeError && gradeError.code !== 'PGRST116') throw gradeError;
      setGrade(gradeData);

    } catch (error) {
      console.error('Error fetching journal:', error);
      toast.error('Failed to load journal data');
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async () => {
    if (!journal || !assignment) return;
    
    if (journal.resubmission_count >= 1) {
      toast.error('You have already used your one allowed resubmission');
      return;
    }

    if (resubmitContent.trim().length < 100) {
      toast.error('Your resubmission must be at least 100 characters');
      return;
    }

    try {
      setResubmitting(true);

      // Update the journal entry
      const { error: updateError } = await supabase
        .from('mus240_journal_entries')
        .update({
          content: resubmitContent,
          word_count: resubmitContent.split(/\s+/).length,
          resubmission_count: journal.resubmission_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', journal_id);

      if (updateError) throw updateError;

      // Call grading function
      const { data: gradeResult, error: gradeError } = await supabase.functions.invoke('grade-journal-v2', {
        body: {
          journalId: journal_id,
          content: resubmitContent,
          prompt: assignment.prompt,
          maxPoints: assignment.points,
          assignmentId: assignment.id
        }
      });

      if (gradeError) throw gradeError;

      toast.success('Journal resubmitted and graded successfully!');
      setShowResubmit(false);
      fetchJournalData();

    } catch (error) {
      console.error('Error resubmitting:', error);
      toast.error('Failed to resubmit journal');
    } finally {
      setResubmitting(false);
    }
  };

  const getScoreColor = (score: number, maxPoints: number) => {
    const percentage = (score / maxPoints) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLetterGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800 border-green-300';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading...</div>
        </div>
      </UniversalLayout>
    );
  }

  if (!journal || !assignment) {
    return (
      <UniversalLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p>Journal not found</p>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  const canResubmit = journal.resubmission_count < 1 && grade;

  return (
    <UniversalLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/classes/mus240/student/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* AI Detection Warning */}
        {grade?.ai_writing_detected && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>AI Writing Detected</strong>
              <p className="mt-1">
                Our system detected that this submission may have been written using AI tools 
                (Confidence: {grade.ai_detection_confidence}%). {grade.ai_detection_notes}
              </p>
              <p className="mt-2 text-sm">
                Academic integrity requires original work. If you used AI assistance, please resubmit 
                with your own authentic writing.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Assignment Info */}
        <Card>
          <CardHeader>
            <CardTitle>{assignment.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Assignment Prompt:</p>
                <p className="text-sm text-muted-foreground">{assignment.prompt}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Submitted: {format(new Date(journal.submitted_at), 'MMM dd, yyyy h:mm a')}</span>
                <span>•</span>
                <span>Word count: {journal.word_count}</span>
                {journal.resubmission_count > 0 && (
                  <>
                    <span>•</span>
                    <Badge variant="outline">Resubmitted</Badge>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Submission */}
        <Card>
          <CardHeader>
            <CardTitle>Your Submission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none p-4 bg-muted rounded-lg">
              <p className="whitespace-pre-wrap">{journal.content}</p>
            </div>
          </CardContent>
        </Card>

        {/* Grade Display */}
        {grade && !showResubmit && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Grade</CardTitle>
                <Badge className={getLetterGradeColor(grade.letter_grade)}>
                  {grade.letter_grade}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <div className="text-center p-6 bg-muted rounded-lg">
                <div className={`text-4xl font-bold ${getScoreColor(grade.overall_score, assignment.points)}`}>
                  {grade.overall_score}/{assignment.points}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {((grade.overall_score / assignment.points) * 100).toFixed(1)}%
                </div>
              </div>

              {/* Rubric Breakdown */}
              <div>
                <h3 className="font-medium mb-4">Rubric Breakdown</h3>
                <div className="space-y-4">
                  {grade.rubric?.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{item.criterion}</span>
                        <Badge variant="outline">
                          {item.score}/{item.maxScore}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Feedback */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Instructor Feedback</h3>
                <p className="text-sm text-muted-foreground">{grade.ai_feedback}</p>
              </div>

              {/* Resubmit Option */}
              {canResubmit && (
                <div className="border-t pt-4">
                  <Alert>
                    <RefreshCcw className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium mb-2">One Resubmission Available</p>
                      <p className="text-sm mb-4">
                        You can revise and resubmit this journal one time for a new grade. 
                        Your resubmitted work will be regraded automatically.
                      </p>
                      <Button onClick={() => setShowResubmit(true)} variant="outline" className="gap-2">
                        <RefreshCcw className="h-4 w-4" />
                        Revise and Resubmit
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resubmission Form */}
        {showResubmit && (
          <Card>
            <CardHeader>
              <CardTitle>Revise Your Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm">
                    This is your only resubmission opportunity. Make sure to:
                  </p>
                  <ul className="text-sm list-disc list-inside mt-2 space-y-1">
                    <li>Write in your own authentic voice</li>
                    <li>Address the feedback provided in the rubric</li>
                    <li>Do NOT use AI writing tools - academic integrity is required</li>
                    <li>Proofread carefully before submitting</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Revised Submission (minimum 100 characters)
                </label>
                <Textarea
                  value={resubmitContent}
                  onChange={(e) => setResubmitContent(e.target.value)}
                  rows={15}
                  placeholder="Write your revised journal entry here..."
                />
                <div className="text-sm text-muted-foreground mt-1">
                  Word count: {resubmitContent.split(/\s+/).filter(w => w.length > 0).length}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleResubmit} 
                  disabled={resubmitting || resubmitContent.trim().length < 100}
                  className="gap-2"
                >
                  {resubmitting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Submit for Regrading
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowResubmit(false);
                    setResubmitContent(journal.content);
                  }}
                  disabled={resubmitting}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Grade Yet */}
        {!grade && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Your submission has not been graded yet. Check back later.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </UniversalLayout>
  );
};

export default StudentJournalGradePage;
