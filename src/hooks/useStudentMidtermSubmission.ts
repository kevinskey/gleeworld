import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentMidtermSubmission {
  id: string;
  user_id: string;
  blues_answer: string | null;
  comprehensive_feedback: string | null;
  created_at: string;
  essay_answer: string | null;
  excerpt_1_context: string | null;
  excerpt_1_features: string | null;
  excerpt_1_genre: string | null;
  excerpt_2_context: string | null;
  excerpt_2_features: string | null;
  excerpt_2_genre: string | null;
  excerpt_3_context: string | null;
  excerpt_3_features: string | null;
  excerpt_3_genre: string | null;
  feedback: string | null;
  feedback_generated_at: string | null;
  field_holler_answer: string | null;
  grade: number | null;
  graded_at: string | null;
  graded_by: string | null;
  is_submitted: boolean;
  negro_spiritual_answer: string | null;
  ragtime_answer: string | null;
  ring_shout_answer: string | null;
  selected_essay_question: number | null;
  selected_terms: string[];
  submitted_at: string;
  swing_answer: string | null;
  time_started: string;
  total_time_minutes: number | null;
  updated_at: string;
}

export const useStudentMidtermSubmission = (studentId: string) => {
  return useQuery({
    queryKey: ['student-midterm-submission', studentId],
    queryFn: async (): Promise<StudentMidtermSubmission | null> => {
      const { data, error } = await supabase
        .from('mus240_midterm_submissions')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching student midterm submission:', error);
        throw error;
      }

      return data;
    },
    enabled: !!studentId,
  });
};