import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';

// MUS 240 course ID from gw_courses (canonical source)
const MUS240_COURSE_ID = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

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

      // Check gw_course_enrollments - the unified source of truth
      const { data: enrollmentData, error: enrollError } = await supabase
        .from('gw_course_enrollments')
        .select('id, user_id, semester, enrollment_status, enrolled_at, grade, created_at, updated_at')
        .eq('course_id', MUS240_COURSE_ID)
        .eq('user_id', user.id)
        .eq('semester', semester)
        .eq('enrollment_status', 'enrolled')
        .maybeSingle();

      if (enrollError) {
        console.error('Error checking enrollment:', enrollError);
      }

      if (enrollmentData) {
        // Map to legacy format for compatibility
        setEnrollment({
          id: enrollmentData.id,
          student_id: enrollmentData.user_id,
          semester: enrollmentData.semester || semester,
          enrollment_status: enrollmentData.enrollment_status || 'enrolled',
          enrolled_at: enrollmentData.enrolled_at,
          final_grade: enrollmentData.grade,
          created_at: enrollmentData.created_at,
          updated_at: enrollmentData.updated_at,
        });
        setLoading(false);
        return;
      }

      // If not enrolled in current semester, check if enrolled in any semester
      const { data: anyEnrollment, error: anyError } = await supabase
        .from('gw_course_enrollments')
        .select('id, user_id, semester, enrollment_status, enrolled_at, grade, created_at, updated_at')
        .eq('course_id', MUS240_COURSE_ID)
        .eq('user_id', user.id)
        .eq('enrollment_status', 'enrolled')
        .order('enrolled_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!anyError && anyEnrollment && anyEnrollment.semester !== semester) {
        // User is enrolled in a different semester - auto-switch to it
        console.log(`Auto-switching from ${semester} to enrolled semester: ${anyEnrollment.semester}`);
        setCurrentSemester(anyEnrollment.semester);
        setEnrollment({
          id: anyEnrollment.id,
          student_id: anyEnrollment.user_id,
          semester: anyEnrollment.semester || semester,
          enrollment_status: anyEnrollment.enrollment_status || 'enrolled',
          enrolled_at: anyEnrollment.enrolled_at,
          final_grade: anyEnrollment.grade,
          created_at: anyEnrollment.created_at,
          updated_at: anyEnrollment.updated_at,
        });
        setLoading(false);
        return;
      }

      setEnrollment(null);
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
