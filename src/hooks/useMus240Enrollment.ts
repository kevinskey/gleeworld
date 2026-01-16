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
  const [gwEnrollment, setGwEnrollment] = useState<boolean>(false);
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

      // Check BOTH enrollment tables - legacy mus240_enrollments AND gw_course_enrollments
      
      // 1. First check the legacy mus240_enrollments table
      const { data: legacyData, error: legacyError } = await supabase
        .from('mus240_enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('semester', semester)
        .maybeSingle();

      if (legacyError) {
        console.error('Error checking legacy enrollment:', legacyError);
      }

      // 2. Also check gw_course_enrollments for MUS 240
      const { data: gwCourseData, error: gwCourseError } = await supabase
        .from('gw_courses')
        .select('id')
        .or('course_code.ilike.%MUS 240%,course_code.ilike.%MUS-240%,course_code.eq.MUS 240')
        .limit(1)
        .maybeSingle();

      let isEnrolledInGw = false;
      if (gwCourseData && !gwCourseError) {
        // First try by user_id
        const { data: gwEnrollmentByUserId } = await supabase
          .from('gw_course_enrollments')
          .select('id, enrollment_status')
          .eq('course_id', gwCourseData.id)
          .eq('user_id', user.id)
          .eq('enrollment_status', 'enrolled')
          .maybeSingle();

        if (gwEnrollmentByUserId) {
          isEnrolledInGw = true;
          console.log('Found MUS 240 enrollment in gw_course_enrollments by user_id');
        } else {
          // Also check by student_profile_id (some enrollments use profile ID instead of user ID)
          const { data: profileData } = await supabase
            .from('gw_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profileData) {
            const { data: gwEnrollmentByProfileId } = await supabase
              .from('gw_course_enrollments')
              .select('id, enrollment_status')
              .eq('course_id', gwCourseData.id)
              .eq('student_profile_id', profileData.id)
              .eq('enrollment_status', 'enrolled')
              .maybeSingle();

            if (gwEnrollmentByProfileId) {
              isEnrolledInGw = true;
              console.log('Found MUS 240 enrollment in gw_course_enrollments by student_profile_id');
            }
          }
        }
      }

      setGwEnrollment(isEnrolledInGw);

      // If enrolled in gw_course_enrollments but not in legacy, that's still valid
      if (isEnrolledInGw && !legacyData) {
        // Create a synthetic enrollment object for compatibility
        setEnrollment({
          id: 'gw-enrollment',
          student_id: user.id,
          semester: semester,
          enrollment_status: 'enrolled',
          enrolled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }

      // If not enrolled in current semester's legacy table, check any semester
      if (!legacyData && !isEnrolledInGw) {
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

      setEnrollment(legacyData);
    } catch (err) {
      console.error('Error checking enrollment:', err);
      setError('Failed to check enrollment status');
    } finally {
      setLoading(false);
    }
  };

  const isEnrolled = () => {
    // User is enrolled if they have a legacy enrollment OR a gw_course_enrollments entry
    return enrollment?.enrollment_status === 'enrolled' || gwEnrollment;
  };

  return {
    enrollment,
    loading,
    error,
    isEnrolled,
    refetch: checkEnrollment
  };
};