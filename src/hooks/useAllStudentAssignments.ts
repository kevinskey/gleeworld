import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { mus240Assignments } from '@/data/mus240Assignments';

export interface AllAssignmentSubmission {
  id: string;
  assignment_id: string;
  assignment_title: string;
  assignment_type: string;
  assignment_due_date: string;
  assignment_points: number;
  content?: string;
  is_submitted: boolean;
  submitted_at?: string;
  grade?: number;
  letter_grade?: string;
  feedback?: string;
  graded_at?: string;
}

export const useAllStudentAssignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AllAssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllAssignments = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch journal entries
        const { data: journals, error: journalsError } = await supabase
          .from('mus240_journal_entries')
          .select('id, assignment_id, content, is_published, submitted_at')
          .eq('student_id', user.id);

        if (journalsError) throw journalsError;

        // Fetch journal grades
        const { data: journalGrades, error: gradesError} = await supabase
          .from('mus240_journal_grades')
          .select('assignment_id, overall_score, letter_grade, ai_feedback, instructor_feedback, graded_at')
          .eq('student_id', user.id);

        if (gradesError) throw gradesError;

        // Fetch midterm submission
        const { data: midterm, error: midtermError } = await supabase
          .from('mus240_midterm_submissions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (midtermError) throw midtermError;

        // Create maps for quick lookup
        const journalMap = journals?.reduce((acc: Record<string, any>, j) => {
          acc[j.assignment_id] = j;
          return acc;
        }, {}) || {};

        const gradeMap = journalGrades?.reduce((acc: Record<string, any>, g) => {
          acc[g.assignment_id] = g;
          return acc;
        }, {}) || {};

        // Get all assignments from the course data
        const allCourseAssignments = mus240Assignments.flatMap(week => week.assignments);

        const assignmentsList: AllAssignmentSubmission[] = [];

        // Add all regular assignments (journals, papers, etc.)
        allCourseAssignments.forEach(assignment => {
          const journal = journalMap[assignment.id];
          const grade = gradeMap[assignment.id];

          assignmentsList.push({
            id: journal?.id || `no-sub-${assignment.id}`,
            assignment_id: assignment.id,
            assignment_title: assignment.title,
            assignment_type: assignment.type,
            assignment_due_date: assignment.dueDate,
            assignment_points: assignment.points || 0,
            content: journal?.content,
            is_submitted: journal?.is_published || false,
            submitted_at: journal?.submitted_at,
            grade: grade?.overall_score,
            letter_grade: grade?.letter_grade,
            feedback: grade?.instructor_feedback || grade?.ai_feedback,
            graded_at: grade?.graded_at
          });
        });

        // Add midterm if it exists
        if (midterm) {
          assignmentsList.push({
            id: midterm.id,
            assignment_id: 'midterm',
            assignment_title: 'Midterm Exam',
            assignment_type: 'exam',
            assignment_due_date: '2024-10-15', // You might want to make this dynamic
            assignment_points: 100,
            is_submitted: midterm.is_submitted,
            submitted_at: midterm.submitted_at,
            grade: midterm.grade ? Number(midterm.grade) : undefined,
            letter_grade: undefined, // Midterm uses numeric grade
            feedback: midterm.comprehensive_feedback,
            graded_at: midterm.graded_at
          });
        }

        setAssignments(assignmentsList);
      } catch (err) {
        console.error('Error fetching assignments:', err);
        setError('Failed to load assignments');
      } finally {
        setLoading(false);
      }
    };

    fetchAllAssignments();
  }, [user]);

  return { assignments, loading, error };
};