
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
      console.log('useJournalGrading: About to call edge function with:');
      console.log('- assignmentId:', assignmentId);
      console.log('- studentId:', studentId);
      console.log('- journalId:', journalId);
      console.log('- journalContent length:', journalContent?.length);
      
      const { data, error } = await supabase.functions.invoke('grade-journal', {
        body: {
          assignment_id: assignmentId,
          journal_content: journalContent,
          student_id: studentId,
          journal_id: journalId
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        const errorMessage = error.message || 'Edge function returned an error';
        const errorDetails = {
          error: errorMessage,
          trace: error.stack || 'No stack trace available',
          context: error.context || 'No additional context'
        };
        
        toast({
          title: "Grading Failed",
          description: `${errorMessage}. Check console for details.`,
          variant: "destructive"
        });
        
        throw { ...error, details: errorDetails };
      }

      if (!data) {
        const errorDetails = {
          error: 'No data returned from edge function',
          trace: 'Edge function returned null or undefined data',
          context: 'This may indicate a server error or timeout'
        };
        
        toast({
          title: "Grading Failed",
          description: "No response from AI grading service",
          variant: "destructive"
        });
        
        throw { message: 'No data returned', details: errorDetails };
      }

      if (!data.success) {
        const errorDetails = {
          error: data.error || 'Grading operation failed',
          trace: data.trace || 'No trace information available',
          context: 'Edge function returned success: false'
        };
        
        toast({
          title: "Grading Failed",
          description: data.error || "AI grading operation failed",
          variant: "destructive"
        });
        
        throw { message: data.error || 'Grading failed', details: errorDetails };
      }

      toast({
        title: "Journal Graded Successfully",
        description: `Grade: ${data.grade.overall_score}% (${data.grade.letter_grade})`,
      });

      return data.grade;
    } catch (error: any) {
      console.error('Error grading journal:', error);
      
      // If error doesn't already have details, create them
      if (!error.details) {
        error.details = {
          error: error.message || 'Unknown error occurred',
          trace: error.stack || 'No stack trace available',
          context: 'Client-side error during edge function call'
        };
      }
      
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
