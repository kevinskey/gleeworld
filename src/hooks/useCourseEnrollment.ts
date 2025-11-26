import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useCourseEnrollment = (courseId: string) => {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkEnrollment = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('glee_academy_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setEnrollment(data);
    } catch (err) {
      console.error('Error checking enrollment:', err);
      setError('Failed to check enrollment status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkEnrollment();
  }, [user, courseId]);

  const enroll = async () => {
    if (!user) {
      toast.error('Please log in to enroll');
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: enrollError } = await supabase
        .from('glee_academy_enrollments')
        .insert({
          course_id: courseId,
          student_id: user.id,
          enrollment_status: 'enrolled'
        })
        .select()
        .single();

      if (enrollError) throw enrollError;

      setEnrollment(data);
      toast.success('Successfully enrolled in course!');
    } catch (err: any) {
      console.error('Error enrolling:', err);
      if (err.code === '23505') {
        toast.error('You are already enrolled in this course');
      } else {
        toast.error('Failed to enroll in course');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isEnrolled = enrollment?.enrollment_status === 'enrolled';

  return {
    enrollment,
    isLoading,
    error,
    isEnrolled,
    enroll,
    refetch: checkEnrollment
  };
};
