import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CourseTA {
  id: string;
  user_id: string;
  course_code: string;
  assigned_by: string;
  assigned_at: string;
  is_active: boolean;
  notes?: string;
}

export const useCourseTA = (courseCode: string = 'MUS240') => {
  const { user } = useAuth();
  const [isTA, setIsTA] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTAStatus = async () => {
      if (!user) {
        setIsTA(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('course_teaching_assistants')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_code', courseCode)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('Error checking TA status:', error);
          setIsTA(false);
        } else {
          setIsTA(!!data);
        }
      } catch (error) {
        console.error('Exception checking TA status:', error);
        setIsTA(false);
      } finally {
        setLoading(false);
      }
    };

    checkTAStatus();
  }, [user, courseCode]);

  return { isTA, loading };
};

export const useCourseTeachingAssistants = (courseCode: string = 'MUS240') => {
  const [tas, setTAs] = useState<CourseTA[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTAs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('course_teaching_assistants')
        .select('*')
        .eq('course_code', courseCode)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setTAs(data || []);
    } catch (error) {
      console.error('Error fetching TAs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTAs();
  }, [courseCode]);

  const addTA = async (userId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('course_teaching_assistants')
        .insert({
          user_id: userId,
          course_code: courseCode,
          notes,
        });

      if (error) throw error;
      await fetchTAs();
      return { success: true };
    } catch (error: any) {
      console.error('Error adding TA:', error);
      return { success: false, error: error.message };
    }
  };

  const removeTA = async (taId: string) => {
    try {
      const { error } = await supabase
        .from('course_teaching_assistants')
        .update({ is_active: false })
        .eq('id', taId);

      if (error) throw error;
      await fetchTAs();
      return { success: true };
    } catch (error: any) {
      console.error('Error removing TA:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    tas,
    loading,
    addTA,
    removeTA,
    refetch: fetchTAs,
  };
};
