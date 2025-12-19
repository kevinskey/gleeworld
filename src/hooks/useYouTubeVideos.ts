import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GLEE_CLUB_CHANNEL_ID } from '@/utils/youtubeUtils';

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration: string;
  published_at: string;
  view_count: number;
  video_url: string;
  is_featured?: boolean;
}

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_url: string;
  subscriber_count: number;
  video_count: number;
}

export const useYouTubeVideos = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchYouTubeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch channel info (official Spelman College Glee Club)
      const { data: channelData, error: channelError } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('channel_id', GLEE_CLUB_CHANNEL_ID)
        .limit(1)
        .maybeSingle();

      if (channelError) {
        console.warn('Channel query error:', channelError);
      }

      // Fetch latest videos for this channel (if available)
      let videosQuery = supabase
        .from('youtube_videos')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(6);

      if (channelData?.id) {
        videosQuery = videosQuery.eq('channel_id', channelData.id);
      }

      const { data: videosData, error: videosError } = await videosQuery;

      if (videosError) {
        throw videosError;
      }

      setVideos(videosData || []);
      setChannel(channelData || null);
    } catch (err) {
      console.error('Error fetching YouTube data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch YouTube data');
    } finally {
      setLoading(false);
    }
  };

  const syncYouTubeVideos = async (channelInput: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('sync-youtube-videos', {
        body: { channelInput, maxResults: 10 }
      });

      if (error) {
        throw error;
      }

      // Refresh local data after sync
      await fetchYouTubeData();
      
      return data;
    } catch (err) {
      console.error('Error syncing YouTube videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync YouTube videos');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getVideoEmbedUrl = (videoId: string, autoplay = false, mute = true, start?: number) => {
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      mute: mute ? '1' : '0',
      loop: '1',
      playlist: videoId,
      controls: '0',
      showinfo: '0',
      rel: '0',
      iv_load_policy: '3',
      modestbranding: '1',
      enablejsapi: '1'
    });
    
    if (start) {
      params.set('start', start.toString());
    }

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  useEffect(() => {
    fetchYouTubeData();
  }, []);

  return {
    videos,
    channel,
    loading,
    error,
    syncYouTubeVideos,
    getVideoEmbedUrl,
    refetch: fetchYouTubeData
  };
};