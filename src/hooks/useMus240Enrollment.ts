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

      // First check: direct user_id match in gw_course_enrollments
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

      // Second check: match via student_profile_id using email
      // This handles CSV-imported students who haven't been linked by user_id yet
      if (user.email) {
        // Find student profile by email
        const { data: studentProfile, error: profileError } = await supabase
          .from('gw_student_profiles')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (!profileError && studentProfile) {
          // Check if this student profile is enrolled
          const { data: profileEnrollment, error: profEnrollError } = await supabase
            .from('gw_course_enrollments')
            .select('id, student_profile_id, semester, enrollment_status, enrolled_at, grade, created_at, updated_at')
            .eq('course_id', MUS240_COURSE_ID)
            .eq('student_profile_id', studentProfile.id)
            .eq('semester', semester)
            .eq('enrollment_status', 'enrolled')
            .maybeSingle();

          if (!profEnrollError && profileEnrollment) {
            // Link the user_id to this enrollment for future lookups
            await supabase
              .from('gw_course_enrollments')
              .update({ user_id: user.id })
              .eq('id', profileEnrollment.id);

            setEnrollment({
              id: profileEnrollment.id,
              student_id: user.id,
              semester: profileEnrollment.semester || semester,
              enrollment_status: profileEnrollment.enrollment_status || 'enrolled',
              enrolled_at: profileEnrollment.enrolled_at,
              final_grade: profileEnrollment.grade,
              created_at: profileEnrollment.created_at,
              updated_at: profileEnrollment.updated_at,
            });
            setLoading(false);
            return;
          }

          // Check any semester for this student profile
          const { data: anyProfileEnrollment, error: anyProfError } = await supabase
            .from('gw_course_enrollments')
            .select('id, student_profile_id, semester, enrollment_status, enrolled_at, grade, created_at, updated_at')
            .eq('course_id', MUS240_COURSE_ID)
            .eq('student_profile_id', studentProfile.id)
            .eq('enrollment_status', 'enrolled')
            .order('enrolled_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!anyProfError && anyProfileEnrollment) {
            // Link user_id and auto-switch semester
            await supabase
              .from('gw_course_enrollments')
              .update({ user_id: user.id })
              .eq('id', anyProfileEnrollment.id);

            console.log(`Auto-switching from ${semester} to enrolled semester: ${anyProfileEnrollment.semester}`);
            setCurrentSemester(anyProfileEnrollment.semester);
            setEnrollment({
              id: anyProfileEnrollment.id,
              student_id: user.id,
              semester: anyProfileEnrollment.semester || semester,
              enrollment_status: anyProfileEnrollment.enrollment_status || 'enrolled',
              enrolled_at: anyProfileEnrollment.enrolled_at,
              final_grade: anyProfileEnrollment.grade,
              created_at: anyProfileEnrollment.created_at,
              updated_at: anyProfileEnrollment.updated_at,
            });
            setLoading(false);
            return;
          }
        }
      }

      // If not enrolled in current semester, check if enrolled in any semester by user_id
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
