import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TeachingAssistant {
  id: string;
  user_id: string;
  course_code: string;
  is_active: boolean;
  notes: string | null;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export const useCourseTeachingAssistants = (courseCode: string) => {
  return useQuery({
    queryKey: ['course-teaching-assistants', courseCode],
    queryFn: async (): Promise<TeachingAssistant[]> => {
      // Normalize course code for query (MUS 240 -> MUS240)
      const normalizedCode = courseCode.replace(' ', '');
      
      const { data, error } = await supabase
        .from('course_teaching_assistants')
        .select(`
          id,
          user_id,
          course_code,
          is_active,
          notes
        `)
        .eq('course_code', normalizedCode)
        .eq('is_active', true);

      if (error) throw error;

      // Fetch profile info for each TA
      const tasWithProfiles = await Promise.all(
        (data || []).map(async (ta) => {
          const { data: profile } = await supabase
            .from('gw_profiles')
            .select('full_name, email, avatar_url')
            .eq('user_id', ta.user_id)
            .single();

          return {
            ...ta,
            profile: profile || null,
          };
        })
      );

      return tasWithProfiles;
    },
    enabled: !!courseCode,
  });
};
