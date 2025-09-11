import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Mus240EnrollmentWithProfile {
  id: string;
  student_id: string;
  semester: string;
  enrollment_status: string;
  enrolled_at: string;
  final_grade?: string;
  instructor_notes?: string;
  created_at: string;
  updated_at: string;
  gw_profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

export const useMus240Enrollments = (semester: string = 'Fall 2025') => {
  const [enrollments, setEnrollments] = useState<Mus240EnrollmentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEnrollments();
  }, [semester]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get all enrollments
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('mus240_enrollments')
        .select('*')
        .eq('semester', semester)
        .order('enrolled_at', { ascending: false });

      if (enrollmentError) {
        throw enrollmentError;
      }

      // Then, get profile data for each enrolled student
      const enrollmentsWithProfiles = await Promise.all(
        (enrollmentData || []).map(async (enrollment) => {
          const { data: profileData } = await supabase
            .from('gw_profiles')
            .select('full_name, email, phone')
            .eq('user_id', enrollment.student_id)
            .single();

          return {
            ...enrollment,
            gw_profiles: profileData
          };
        })
      );

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