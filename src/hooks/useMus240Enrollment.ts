import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';

export interface Mus240Enrollment {
  id: string;
  student_id: string;
  semester: string;
  enrollment_status: string;
  enrolled_at: string;
  final_grade?: string;
  instructor_notes?: string;
  created_at: string;
  updated_at: string;
}

export const useMus240Enrollment = (semesterOverride?: string) => {
  const { user } = useAuth();
  const { currentSemester, setCurrentSemester } = useMus240SemesterSafe();
  const semester = semesterOverride || currentSemester;
  const [enrollment, setEnrollment] = useState<Mus240Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkEnrollment();
    } else {
      setLoading(false);
    }
  }, [user, semester]);

  const checkEnrollment = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First, try to find enrollment in the requested semester
      const { data, error: supabaseError } = await supabase
        .from('mus240_enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('semester', semester)
        .maybeSingle();

      if (supabaseError) {
        throw supabaseError;
      }

      // If not enrolled in current semester, check if enrolled in any semester
      // and auto-switch to that semester
      if (!data) {
        const { data: anyEnrollment, error: anyError } = await supabase
          .from('mus240_enrollments')
          .select('*')
          .eq('student_id', user.id)
          .eq('enrollment_status', 'enrolled')
          .order('enrolled_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!anyError && anyEnrollment && anyEnrollment.semester !== semester) {
          // User is enrolled in a different semester - auto-switch to it
          console.log(`Auto-switching from ${semester} to enrolled semester: ${anyEnrollment.semester}`);
          setCurrentSemester(anyEnrollment.semester);
          setEnrollment(anyEnrollment);
          setLoading(false);
          return;
        }
      }

      setEnrollment(data);
    } catch (err) {
      console.error('Error checking enrollment:', err);
      setError('Failed to check enrollment status');
    } finally {
      setLoading(false);
    }
  };

  const isEnrolled = () => {
    return enrollment?.enrollment_status === 'enrolled';
  };

  return {
    enrollment,
    loading,
    error,
    isEnrolled,
    refetch: checkEnrollment
  };
};