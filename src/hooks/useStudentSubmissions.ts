import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { mus240Assignments } from '@/data/mus240Assignments';

interface StudentSubmission {
  id: string;
  assignment_id: string;
  assignment_title: string;
  assignment_due_date: string;
  assignment_points: number;
  content: string;
  word_count: number;
  is_published: boolean;
  status: string;
  submitted_at: string;
  grade?: {
    overall_score: number;
    letter_grade: string;
    feedback: string;
    graded_at: string;
  };
  comment_count: number;
}

export const useStudentSubmissions = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all journal entries for the user
      const { data: journals, error: journalsError } = await supabase
        .from('mus240_journal_entries')
        .select(`
          id,
          assignment_id,
          content,
          word_count,
          is_published,
          submitted_at,
          created_at
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (journalsError) throw journalsError;

      // Fetch grades for user's submissions
      const { data: grades, error: gradesError } = await supabase
        .from('mus240_journal_grades')
        .select('*')
        .eq('student_id', user.id);

      if (gradesError) throw gradesError;

      // Fetch comment counts for each journal
      const journalIds = journals?.map(j => j.id) || [];
      const { data: commentCounts, error: commentsError } = await supabase
        .from('mus240_journal_comments')
        .select('journal_id')
        .in('journal_id', journalIds);

      if (commentsError) throw commentsError;

      // Create comment count map
      const commentCountMap = commentCounts?.reduce((acc: Record<string, number>, comment) => {
        acc[comment.journal_id] = (acc[comment.journal_id] || 0) + 1;
        return acc;
      }, {}) || {};

      // Create grade map
      const gradeMap = grades?.reduce((acc: Record<string, any>, grade) => {
        acc[grade.assignment_id] = grade;
        return acc;
      }, {}) || {};

      // Get all assignments and merge with submissions
      const allAssignments = mus240Assignments
        .flatMap(week => week.assignments)
        .filter(a => a.type === 'listening-journal');

      const submissionsWithDetails: StudentSubmission[] = allAssignments.map(assignment => {
        const journal = journals?.find(j => j.assignment_id === assignment.id);
        const grade = gradeMap[assignment.id];
        
        return {
          id: journal?.id || `no-submission-${assignment.id}`,
          assignment_id: assignment.id,
          assignment_title: assignment.title,
          assignment_due_date: assignment.dueDate,
          assignment_points: assignment.points,
          content: journal?.content || '',
          word_count: journal?.word_count || 0,
          is_published: journal?.is_published || false,
          status: journal ? 'submitted' : 'not-started',
          submitted_at: journal?.submitted_at || journal?.created_at || '',
          grade: grade ? {
            overall_score: grade.overall_score,
            letter_grade: grade.letter_grade,
            feedback: grade.feedback,
            graded_at: grade.graded_at
          } : undefined,
          comment_count: journal ? (commentCountMap[journal.id] || 0) : 0
        };
      });

      setSubmissions(submissionsWithDetails);
    } catch (err) {
      console.error('Error fetching student submissions:', err);
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [user]);

  return {
    submissions,
    loading,
    error,
    refetch: fetchSubmissions
  };
};