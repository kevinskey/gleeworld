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
  channel_id?: string | null;
  source_type?: string | null;
}

export interface YouTubeChannelVideo {
  video_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
}

export interface YouTubeChannelResult {
  channel_id: string;
  channel_title: string;
  channel_thumbnail: string;
  videos: YouTubeChannelVideo[];
}

export const useLykeHouseHero = () => {
  const [videos, setVideos] = useState<LykeHouseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingChannel, setFetchingChannel] = useState(false);
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

  const fetchChannelVideos = async (channelInput: string, maxResults = 10): Promise<YouTubeChannelResult | null> => {
    try {
      setFetchingChannel(true);
      const { data, error } = await supabase.functions.invoke('youtube-channel-videos', {
        body: { channelInput, maxResults }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data as YouTubeChannelResult;
    } catch (err: any) {
      console.error('Error fetching channel videos:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to fetch channel videos",
        variant: "destructive",
      });
      return null;
    } finally {
      setFetchingChannel(false);
    }
  };

  const addVideo = async (video: { 
    video_id: string; 
    title?: string | null; 
    video_url?: string | null; 
    thumbnail_url?: string | null; 
    is_active?: boolean;
    channel_id?: string | null;
    source_type?: 'video' | 'channel';
  }) => {
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
          display_order: nextOrder,
          channel_id: video.channel_id || null,
          source_type: video.source_type || 'video'
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

  const addVideosFromChannel = async (channelResult: YouTubeChannelResult, selectedVideoIds?: string[]) => {
    try {
      const videosToAdd = selectedVideoIds 
        ? channelResult.videos.filter(v => selectedVideoIds.includes(v.video_id))
        : channelResult.videos;

      let addedCount = 0;
      for (const video of videosToAdd) {
        const result = await addVideo({
          video_id: video.video_id,
          title: video.title,
          video_url: `https://youtu.be/${video.video_id}`,
          thumbnail_url: video.thumbnail_url,
          is_active: true,
          channel_id: channelResult.channel_id,
          source_type: 'channel'
        });
        if (result.success) addedCount++;
      }

      toast({ 
        title: "Success", 
        description: `Added ${addedCount} videos from ${channelResult.channel_title}` 
      });
      return { success: true, addedCount };
    } catch (err) {
      console.error('Error adding videos from channel:', err);
      toast({ title: "Error", description: "Failed to add videos from channel", variant: "destructive" });
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
    fetchingChannel,
    addVideo, 
    updateVideo, 
    deleteVideo, 
    reorderVideos,
    fetchChannelVideos,
    addVideosFromChannel,
    refetch: fetchVideos 
  };
};
