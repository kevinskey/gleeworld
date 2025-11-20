import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentAssignmentSubmission {
  id: string;
  student_id: string;
  assignment_id: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  submission_date: string;
  submitted_at: string;
  status: string;
  grade: number | null;
  feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useStudentAssignmentSubmissions = (studentId: string) => {
  return useQuery({
    queryKey: ['student-assignment-submissions', studentId],
    queryFn: async (): Promise<StudentAssignmentSubmission[]> => {
      // First, get all journal assignment IDs to exclude them
      const { data: journalGrades } = await supabase
        .from('mus240_journal_grades')
        .select('assignment_id')
        .eq('student_id', studentId);

      const journalAssignmentIds = journalGrades?.map(jg => jg.assignment_id) || [];

      // Then fetch assignment submissions, excluding journals
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching student assignment submissions:', error);
        throw error;
      }

      // Filter out any submissions that are actually journals
      const nonJournalAssignments = data?.filter(
        submission => !journalAssignmentIds.includes(submission.assignment_id)
      ) || [];

      return nonJournalAssignments;
    },
    enabled: !!studentId,
  });
};
