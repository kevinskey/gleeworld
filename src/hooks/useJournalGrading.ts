
import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
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

export type GradeBreakdown = Record<string, number>;

export type GradeResponse = {
  success: boolean;
  grade: {
    id: string;
    assignment_id: string;
    student_id: string;
    journal_id: string;
    overall_score: number;
    letter_grade: string;
    rubric_scores: Array<{
      criterion: string;
      score: number;
      max_score: number;
      feedback: string;
    }>;
    overall_feedback: string;
    created_at?: string;
  };
  trace?: string;
  error?: string;
};

export async function gradeJournalWithAI(
  supabaseClient: SupabaseClient,
  journal: { id: string; assignment_id: string; student_id: string; content: string }
): Promise<GradeResponse> {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData?.session?.access_token ?? "";
  
  try {
    const { data, error } = await supabaseClient.functions.invoke("grade-journal", {
      body: {
        assignment_id: journal.assignment_id,
        journal_content: journal.content,
        student_id: journal.student_id,
        journal_id: journal.id,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (error) {
      throw new Error(error.message || 'Edge function error');
    }

    return data as GradeResponse;
  } catch (e: any) {
    // Normalize error to a plain string to prevent object rendering in React
    let msg = e?.message || "Grading failed";
    if (e?.context?.response && typeof e.context.response.json === "function") {
      try {
        const detail = await e.context.response.json();
        const status = e.context.response.status;
        msg = `${detail?.error || msg}${status ? ` [${status}]` : ""}${detail?.trace ? ` trace=${detail.trace}` : ""}`;
      } catch {}
    }
    throw new Error(msg);
  }
}

export const useJournalGrading = () => {
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState<JournalGrade[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const gradeJournalWithAI_legacy = async (
    assignmentId: string,
    journalContent: string,
    studentId: string,
    journalId?: string
  ) => {
    setLoading(true);
    try {
      const journal = {
        id: journalId || '',
        assignment_id: assignmentId,
        student_id: studentId,
        content: journalContent
      };

      const result = await gradeJournalWithAI(supabase, journal);

      if (!result.success) {
        throw new Error(result.error || 'Grading failed');
      }

      toast({
        title: "Journal Graded Successfully",
        description: `Grade: ${result.grade.overall_score}% (${result.grade.letter_grade})`,
      });

      return result.grade;
    } catch (error: any) {
      console.error('Error grading journal:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      toast({
        title: "Grading Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw new Error(errorMessage);
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
    gradeJournalWithAI: gradeJournalWithAI_legacy,
    fetchStudentGrade,
    fetchAllGradesForAssignment
  };
};
