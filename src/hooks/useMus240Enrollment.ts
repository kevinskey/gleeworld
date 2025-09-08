import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export const useMus240Enrollment = () => {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Mus240Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkEnrollment();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkEnrollment = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('mus240_enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('semester', 'Fall 2025')
        .maybeSingle();

      if (supabaseError) {
        throw supabaseError;
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