import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Database } from '@/integrations/supabase/types';

type SemesterGrade = Database['public']['Tables']['gw_semester_grades']['Row'];

export const useSemesterGrades = () => {
  const [semesterGrade, setSemesterGrade] = useState<SemesterGrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);

  const getCurrentSemester = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    if (month >= 1 && month <= 5) {
      return `${year}_SPRING`;
    } else if (month >= 6 && month <= 8) {
      return `${year}_SUMMER`;
    } else {
      return `${year}_FALL`;
    }
  };

  const fetchSemesterGrade = useCallback(async (semester?: string) => {
    if (!userProfile?.user_id) return;

    try {
      setLoading(true);
      setError(null);

      const targetSemester = semester || getCurrentSemester();

      const { data, error: fetchError } = await supabase
        .from('gw_semester_grades')
        .select('*')
        .eq('user_id', userProfile.user_id)
        .eq('semester_name', targetSemester)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setSemesterGrade(data);
    } catch (err) {
      console.error('Error fetching semester grade:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch semester grade');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.user_id]);

  const calculateGrade = async (semester?: string) => {
    if (!userProfile?.user_id) return;

    try {
      setLoading(true);
      
      const targetSemester = semester || getCurrentSemester();
      
      const { error: calculateError } = await supabase.rpc('calculate_semester_grade', {
        user_id_param: userProfile.user_id,
        semester_name_param: targetSemester
      });

      if (calculateError) throw calculateError;

      // Refetch the updated grade
      await fetchSemesterGrade(targetSemester);
    } catch (err) {
      console.error('Error calculating grade:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate grade');
    } finally {
      setLoading(false);
    }
  };

  const getWeeklyGrades = () => {
    if (!semesterGrade) return [];

    return [
      { week: 'Week 1', points: semesterGrade.week_1_points || 0 },
      { week: 'Week 2', points: semesterGrade.week_2_points || 0 },
      { week: 'Week 3', points: semesterGrade.week_3_points || 0 },
      { week: 'Week 4', points: semesterGrade.week_4_points || 0 },
      { week: 'Week 5', points: semesterGrade.week_5_points || 0 },
      { week: 'Week 6', points: semesterGrade.week_6_points || 0 },
      { week: 'Week 7', points: semesterGrade.week_7_points || 0 },
      { week: 'Week 8', points: semesterGrade.week_8_points || 0 },
      { week: 'Week 9', points: semesterGrade.week_9_points || 0 },
      { week: 'Week 10', points: semesterGrade.week_10_points || 0 },
      { week: 'Week 11', points: semesterGrade.week_11_points || 0 },
      { week: 'Week 12', points: semesterGrade.week_12_points || 0 },
      { week: 'Week 13', points: semesterGrade.week_13_points || 0 },
    ];
  };

  const getGradeColor = (grade: number | null) => {
    if (!grade) return 'text-muted-foreground';
    
    if (grade >= 90) return 'text-emerald-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    if (grade >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  useEffect(() => {
    if (userProfile?.user_id) {
      fetchSemesterGrade();
    }
  }, [userProfile?.user_id, fetchSemesterGrade]);

  return {
    semesterGrade,
    loading,
    error,
    fetchSemesterGrade,
    calculateGrade,
    getWeeklyGrades,
    getGradeColor,
    getCurrentSemester,
  };
};