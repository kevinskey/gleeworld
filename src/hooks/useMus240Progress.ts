import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAttendance } from './useAttendance';

interface Mus240GradeSummary {
  id: string;
  student_id: string;
  semester: string;
  assignment_points: number;
  assignment_possible: number;
  participation_points: number;
  participation_possible: number;
  overall_points: number;
  overall_possible: number;
  overall_percentage: number;
  letter_grade: string;
  calculated_at: string;
}

interface Mus240ParticipationGrade {
  id: string;
  student_id: string;
  semester: string;
  points_earned: number;
  points_possible: number;
  notes?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  grade: number | null;
  status: string;
  submitted_at: string;
  graded_at: string | null;
  feedback: string | null;
}

export const useMus240Progress = () => {
  const { user } = useAuth();
  const { attendance, getAttendanceStats } = useAttendance();
  const [gradeSummary, setGradeSummary] = useState<Mus240GradeSummary | null>(null);
  const [participationGrade, setParticipationGrade] = useState<Mus240ParticipationGrade | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGradeData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch grade summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('mus240_grade_summaries')
        .select('*')
        .eq('student_id', user.id)
        .eq('semester', 'Fall 2025')
        .maybeSingle();

      if (summaryError) throw summaryError;

      // Fetch participation grade
      const { data: participationData, error: participationError } = await supabase
        .from('mus240_participation_grades')
        .select('*')
        .eq('student_id', user.id)
        .eq('semester', 'Fall 2025')
        .maybeSingle();

      if (participationError) throw participationError;

      // Fetch assignment submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      setGradeSummary(summaryData);
      setParticipationGrade(participationData);
      setSubmissions(submissionsData || []);

      // If no grade summary exists, calculate it
      if (!summaryData) {
        const { data: calculatedData, error: calcError } = await supabase.rpc(
          'calculate_mus240_grade_summary',
          { student_id_param: user.id, semester_param: 'Fall 2025' }
        );

        if (calcError) {
          console.error('Error calculating grade summary:', calcError);
        } else {
          // Refetch the updated summary
          const { data: updatedSummary } = await supabase
            .from('mus240_grade_summaries')
            .select('*')
            .eq('student_id', user.id)
            .eq('semester', 'Fall 2025')
            .maybeSingle();
          
          setGradeSummary(updatedSummary);
        }
      }
    } catch (err) {
      console.error('Error fetching grade data:', err);
      setError('Failed to load grade data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGradeData();
  }, [user]);

  const getLetterGradeColor = (grade: string) => {
    switch (grade?.charAt(0)) {
      case 'A': return 'text-success';
      case 'B': return 'text-primary';
      case 'C': return 'text-warning';
      case 'D': return 'text-destructive';
      case 'F': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const attendanceStats = getAttendanceStats();

  return {
    gradeSummary,
    participationGrade,
    submissions,
    attendanceStats,
    loading,
    error,
    refetch: fetchGradeData,
    getLetterGradeColor,
  };
};