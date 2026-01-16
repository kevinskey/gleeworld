import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LykeHouseVideo {
  id: string;
  title: string | null;
  video_id: string;
  video_url: string | null;
  thumbnail_url: string | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const useLykeHouseHero = () => {
  const [videos, setVideos] = useState<LykeHouseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lyke_house_hero')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error('Error fetching Lyke House Hero videos:', err);
      toast({
        title: "Error",
        description: "Failed to load videos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addVideo = async (video: { video_id: string; title?: string | null; video_url?: string | null; thumbnail_url?: string | null; is_active?: boolean }) => {
    try {
      const nextOrder = videos.length;
      const { data, error } = await supabase
        .from('lyke_house_hero')
        .insert([{ 
          video_id: video.video_id,
          title: video.title,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url,
          is_active: video.is_active ?? true,
          display_order: nextOrder 
        }])
        .select()
        .single();

      if (error) throw error;
      setVideos(prev => [...prev, data]);
      toast({ title: "Success", description: "Video added" });
      return { success: true, data };
    } catch (err) {
      console.error('Error adding video:', err);
      toast({ title: "Error", description: "Failed to add video", variant: "destructive" });
      return { success: false, error: err };
    }
  };

  const updateVideo = async (id: string, updates: Partial<LykeHouseVideo>) => {
    try {
      const { data, error } = await supabase
        .from('lyke_house_hero')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setVideos(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
      toast({ title: "Success", description: "Video updated" });
      return { success: true, data };
    } catch (err) {
      console.error('Error updating video:', err);
      toast({ title: "Error", description: "Failed to update video", variant: "destructive" });
      return { success: false, error: err };
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lyke_house_hero')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setVideos(prev => prev.filter(v => v.id !== id));
      toast({ title: "Success", description: "Video deleted" });
      return { success: true };
    } catch (err) {
      console.error('Error deleting video:', err);
      toast({ title: "Error", description: "Failed to delete video", variant: "destructive" });
      return { success: false, error: err };
    }
  };

  const reorderVideos = async (reorderedVideos: LykeHouseVideo[]) => {
    try {
      const updates = reorderedVideos.map((v, index) => ({
        id: v.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('lyke_house_hero')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      setVideos(reorderedVideos.map((v, i) => ({ ...v, display_order: i })));
      return { success: true };
    } catch (err) {
      console.error('Error reordering videos:', err);
      toast({ title: "Error", description: "Failed to reorder videos", variant: "destructive" });
      return { success: false, error: err };
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  return { 
    videos: videos.filter(v => v.is_active), 
    allVideos: videos,
    loading, 
    addVideo, 
    updateVideo, 
    deleteVideo, 
    reorderVideos,
    refetch: fetchVideos 
  };
};
