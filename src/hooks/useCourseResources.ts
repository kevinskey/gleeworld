import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoResource {
  id: string;
  title: string;
  description: string | null;
  video_path: string;
  youtube_url: string | null;
  course_id: string;
  video_type: string;
  display_order: number | null;
  is_published: boolean | null;
  created_at: string | null;
}

interface AudioResource {
  id: string;
  title: string;
  description: string | null;
  audio_path: string;
  course_id: string;
  duration_seconds: number | null;
  display_order: number | null;
  is_published: boolean | null;
  created_at: string | null;
}

interface DocumentResource {
  id: string;
  title: string;
  description: string | null;
  document_path: string;
  course_id: string;
  category: string | null;
  display_order: number | null;
  is_published: boolean | null;
  created_at: string | null;
}

export const useCourseResources = (courseId: string) => {
  const [videos, setVideos] = useState<VideoResource[]>([]);
  const [audios, setAudios] = useState<AudioResource[]>([]);
  const [documents, setDocuments] = useState<DocumentResource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResources = async () => {
    try {
      setLoading(true);
      
      const [videosResult, audiosResult, documentsResult] = await Promise.all([
        supabase
          .from('course_video_resources')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_published', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('course_audio_resources')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_published', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('course_documents')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_published', true)
          .order('display_order', { ascending: true })
      ]);

      if (videosResult.error) throw videosResult.error;
      if (audiosResult.error) throw audiosResult.error;
      if (documentsResult.error) throw documentsResult.error;

      setVideos(videosResult.data || []);
      setAudios(audiosResult.data || []);
      setDocuments(documentsResult.data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      toast.error('Failed to load course resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchResources();
    }
  }, [courseId]);

  return {
    videos,
    audios,
    documents,
    loading,
    refetch: fetchResources
  };
};
