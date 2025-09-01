import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Mus240Enrollment {
  id: string;
  student_id: string;
  semester: string;
  enrollment_status: string;
  enrolled_at: string;
  final_grade?: string;
  instructor_notes?: string;
}

export const useMus240Enrollment = () => {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Mus240Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user) {
        setLoading(false);
        setIsEnrolled(false);
        return;
      }

      try {
        // Check if user is enrolled in MUS 240
        const { data, error } = await supabase
          .from('mus240_enrollments')
          .select('*')
          .eq('student_id', user.id)
          .eq('enrollment_status', 'enrolled')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking MUS 240 enrollment:', error);
          setIsEnrolled(false);
        } else if (data) {
          setEnrollment(data);
          setIsEnrolled(true);
        } else {
          setIsEnrolled(false);
        }
      } catch (error) {
        console.error('Error checking MUS 240 enrollment:', error);
        setIsEnrolled(false);
      } finally {
        setLoading(false);
      }
    };

    checkEnrollment();
  }, [user]);

  return {
    enrollment,
    isEnrolled,
    loading
  };
};