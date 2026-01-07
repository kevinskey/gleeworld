import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SyncResult {
  groupId: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useCourseMessengerSync = (courseId: string, courseCode: string, courseTitle: string): SyncResult => {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !courseId) return;

    const syncGroup = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Call the sync function
        const { data, error: rpcError } = await supabase
          .rpc('sync_course_messenger_group', {
            p_course_id: courseId,
            p_course_code: courseCode,
            p_course_title: courseTitle
          });

        if (rpcError) throw rpcError;
        
        setGroupId(data);
      } catch (err: any) {
        console.error('Failed to sync course messenger group:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    syncGroup();
  }, [user, courseId, courseCode, courseTitle]);

  return { groupId, isLoading, error };
};

// Utility function to sync a course group on-demand
export const syncCourseMessengerGroup = async (
  courseId: string, 
  courseCode: string, 
  courseTitle: string
): Promise<{ groupId: string | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .rpc('sync_course_messenger_group', {
        p_course_id: courseId,
        p_course_code: courseCode,
        p_course_title: courseTitle
      });

    if (error) throw error;
    
    return { groupId: data, error: null };
  } catch (err: any) {
    console.error('Failed to sync course messenger group:', err);
    return { groupId: null, error: err.message };
  }
};
