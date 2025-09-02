import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InstructorStats {
  activeAssignments: number;
  totalJournals: number;
  pendingGrades: number;
  aiAssistsToday: number;
  totalStudents: number;
  averageGrade: number;
}

export const useMus240InstructorStats = () => {
  const [stats, setStats] = useState<InstructorStats>({
    activeAssignments: 0,
    totalJournals: 0,
    pendingGrades: 0,
    aiAssistsToday: 0,
    totalStudents: 0,
    averageGrade: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get active assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('mus240_assignments')
        .select('id')
        .eq('is_active', true);

      if (assignmentsError) throw assignmentsError;

      // Get total published journals
      const { data: journals, error: journalsError } = await supabase
        .from('mus240_journal_entries')
        .select('id, student_id')
        .eq('is_published', true);

      if (journalsError) throw journalsError;

      // Get journal grades to calculate pending
      const { data: grades, error: gradesError } = await supabase
        .from('mus240_journal_grades')
        .select('journal_id, overall_score');

      if (gradesError) throw gradesError;

      // Calculate pending grades (journals without grades)
      const gradedJournalIds = new Set(grades?.map(g => g.journal_id) || []);
      const pendingGrades = (journals || []).filter(j => !gradedJournalIds.has(j.id)).length;

      // Get unique students
      const uniqueStudents = new Set((journals || []).map(j => j.student_id)).size;

      // Calculate average grade
      const totalScores = grades?.reduce((sum, grade) => sum + (grade.overall_score || 0), 0) || 0;
      const averageGrade = grades?.length ? totalScores / grades.length : 0;

      // Get AI assists today (this would require tracking in a separate table)
      // For now, we'll use a placeholder or could track this via activity logs
      const aiAssistsToday = 0; // Placeholder

      setStats({
        activeAssignments: assignments?.length || 0,
        totalJournals: journals?.length || 0,
        pendingGrades,
        aiAssistsToday,
        totalStudents: uniqueStudents,
        averageGrade: Math.round(averageGrade * 10) / 10
      });
    } catch (err) {
      console.error('Error fetching instructor stats:', err);
      setError('Failed to load course statistics');
    } finally {
      setLoading(false);
    }
  };

  const refetchStats = () => {
    fetchStats();
  };

  return {
    stats,
    loading,
    error,
    refetchStats
  };
};