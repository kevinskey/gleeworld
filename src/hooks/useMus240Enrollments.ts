import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// MUS 240 course ID from gw_courses
const MUS240_COURSE_ID = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

export interface Mus240EnrollmentWithProfile {
  id: string;
  user_id: string | null;
  student_id?: string; // Alias for compatibility
  student_profile_id: string | null;
  enrollment_status: string;
  enrolled_at: string;
  grade?: string;
  final_grade?: string; // Alias for compatibility
  created_at: string;
  updated_at: string;
  gw_profiles?: {
    full_name: string;
    email: string;
    phone?: string;
    role?: string;
  };
}

export const useMus240Enrollments = (semesterOverride?: string) => {
  const [enrollments, setEnrollments] = useState<Mus240EnrollmentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEnrollments();
  }, [semesterOverride]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all enrollments for MUS 240 course from gw_course_enrollments
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('gw_course_enrollments')
        .select('*')
        .eq('course_id', MUS240_COURSE_ID)
        .eq('enrollment_status', 'enrolled')
        .order('enrolled_at', { ascending: false });

      if (enrollmentError) {
        throw enrollmentError;
      }

      // Get user IDs and student profile IDs
      const userIds = (enrollmentData || [])
        .map(e => e.user_id)
        .filter((id): id is string => id !== null);
      
      const studentProfileIds = (enrollmentData || [])
        .filter(e => !e.user_id && e.student_profile_id)
        .map(e => e.student_profile_id)
        .filter((id): id is string => id !== null);

      // Fetch profiles
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email, phone, role')
          .in('user_id', userIds);
        
        profileMap = new Map((profileData || []).map(p => [p.user_id, p]));
      }

      // Fetch student profiles for CSV imports
      let studentProfileMap = new Map<string, any>();
      if (studentProfileIds.length > 0) {
        const { data: studentProfileData } = await supabase
          .from('gw_student_profiles')
          .select('id, full_name, email')
          .in('id', studentProfileIds);
        
        studentProfileMap = new Map((studentProfileData || []).map(p => [p.id, p]));
      }

      const enrollmentsWithProfiles = (enrollmentData || []).map(enrollment => {
        const profile = enrollment.user_id ? profileMap.get(enrollment.user_id) : null;
        const studentProfile = enrollment.student_profile_id ? studentProfileMap.get(enrollment.student_profile_id) : null;
        
        return {
          ...enrollment,
          student_id: enrollment.user_id || enrollment.student_profile_id, // Compatibility alias
          final_grade: enrollment.grade, // Compatibility alias
          gw_profiles: profile || studentProfile || null
        };
      });

      setEnrollments(enrollmentsWithProfiles);
    } catch (err) {
      console.error('Error loading enrollments:', err);
      setError('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  const getActiveEnrollments = () => {
    return enrollments.filter(e => e.enrollment_status === 'enrolled');
  };

  const getTotalStudents = () => {
    return getActiveEnrollments().length;
  };

  return {
    enrollments,
    loading,
    error,
    refetch: fetchEnrollments,
    getActiveEnrollments,
    getTotalStudents
  };
};