import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Enrollment {
  id: string;
  course_id: string;
  enrollment_status: string;
  role: string;
}

export const useCourseEnrollments = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEnrollments([]);
      setLoading(false);
      return;
    }

    const fetchEnrollments = async () => {
      try {
        const { data, error } = await supabase
          .from('gw_course_enrollments')
          .select('id, course_id, enrollment_status, role')
          .eq('user_id', user.id)
          .eq('enrollment_status', 'enrolled');

        if (error) throw error;
        setEnrollments(data || []);
      } catch (err) {
        console.error('Error fetching enrollments:', err);
        setEnrollments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, [user]);

  return { enrollments, loading };
};
