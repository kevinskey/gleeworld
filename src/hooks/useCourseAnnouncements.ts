import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CourseAnnouncement {
  id: string;
  title: string;
  content: string;
  course_id: string;
  created_at: string | null;
  created_by: string | null;
  is_pinned: boolean | null;
  updated_at: string | null;
}

export const useCourseAnnouncements = (courseId: string) => {
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('course_announcements')
        .select('*')
        .eq('course_id', courseId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements');
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchAnnouncements();
    }
  }, [courseId]);

  return {
    announcements,
    loading,
    error,
    refetch: fetchAnnouncements
  };
};
