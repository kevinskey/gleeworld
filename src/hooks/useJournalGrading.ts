
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface JournalGrade {
  id: string;
  student_id: string;
  assignment_id: string;
  overall_score: number;
  letter_grade: string;
  rubric: any;
  feedback: string;
  ai_model?: string;
  graded_by?: string;
  graded_at: string;
}

export const useJournalGrading = () => {
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState<JournalGrade[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const gradeJournalWithAI = async (
    assignmentId: string,
    journalContent: string,
    studentId: string,
    journalId?: string
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('grade-journal', {
        body: {
          assignment_id: assignmentId,
          journal_content: journalContent,
          student_id: studentId,
          journal_id: journalId
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Grading failed');
      }

      toast({
        title: "Journal Graded",
        description: `Grade: ${data.grade.overall_score}% (${data.grade.letter_grade})`,
      });

      return data.grade;
    } catch (error: any) {
      console.error('Error grading journal:', error);
      toast({
        title: "Grading Failed",
        description: error.message || "Failed to grade journal with AI",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentGrade = async (assignmentId: string, studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('mus240_journal_grades')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching grade:', error);
      return null;
    }
  };

  const fetchAllGradesForAssignment = async (assignmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('mus240_journal_grades')
        .select(`
          *,
          gw_profiles!student_id (
            full_name,
            email
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('graded_at', { ascending: false });

      if (error) throw error;
      setGrades(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching assignment grades:', error);
      return [];
    }
  };

  return {
    loading,
    grades,
    gradeJournalWithAI,
    fetchStudentGrade,
    fetchAllGradesForAssignment
  };
};
