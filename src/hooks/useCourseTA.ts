import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CourseTA {
  id: string;
  user_id: string;
  course_code: string;
  assigned_by: string | null;
  assigned_at: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useCourseTA = (courseCode: string = 'MUS240') => {
  const { user } = useAuth();
  const [isTA, setIsTA] = useState(false);
  const [taInfo, setTaInfo] = useState<CourseTA | null>(null);
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
          setTaInfo(data);
        }
      } catch (error) {
        console.error('Error checking TA status:', error);
        setIsTA(false);
      } finally {
        setLoading(false);
      }
    };

    checkTAStatus();
  }, [user, courseCode]);

  return { isTA, taInfo, loading };
};
