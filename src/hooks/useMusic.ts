import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Track {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  duration: number;
  album_id?: string;
  album?: {
    title: string;
    cover_image_url?: string;
  };
  play_count: number;
  isLiked?: boolean;
  likeCount?: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover_image_url?: string;
  release_date?: string;
  description?: string;
  tracks?: Track[];
}

export const useMusic = () => {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tracks with album info
      const { data: tracksData, error: tracksError } = await supabase
        .from('music_tracks')
        .select(`
          *,
          album:music_albums(title, cover_image_url)
        `)
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;

      if (tracksData) {
        // If user is logged in, fetch their likes
        let userLikes: string[] = [];
        if (user) {
          const { data: likesData } = await supabase
            .from('track_likes')
            .select('track_id')
            .eq('user_id', user.id);
          
          userLikes = likesData?.map(like => like.track_id) || [];
        }

        // Fetch like counts for all tracks
        const trackIds = tracksData.map(track => track.id);
        const likeCounts: { [key: string]: number } = {};
        
        for (const trackId of trackIds) {
          const { data: countData } = await supabase
            .rpc('get_track_like_count', { track_uuid: trackId });
          likeCounts[trackId] = countData || 0;
        }

        const enrichedTracks: Track[] = tracksData.map(track => ({
          ...track,
          isLiked: userLikes.includes(track.id),
          likeCount: likeCounts[track.id] || 0
        }));

        setTracks(enrichedTracks);
      }
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tracks');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlbums = async () => {
    try {
      const { data: albumsData, error: albumsError } = await supabase
        .from('music_albums')
        .select(`
          *,
          tracks:music_tracks(*)
        `)
        .order('created_at', { ascending: false });

      if (albumsError) throw albumsError;

      if (albumsData) {
        setAlbums(albumsData);
      }
    } catch (err) {
      console.error('Error fetching albums:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch albums');
    }
  };

  const toggleLike = async (trackId: string) => {
    if (!user) return false;

    try {
      const track = tracks.find(t => t.id === trackId);
      if (!track) return false;

      if (track.isLiked) {
        await supabase
          .from('track_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('track_id', trackId);
      } else {
        await supabase
          .from('track_likes')
          .insert({
            user_id: user.id,
            track_id: trackId
          });
      }

      // Update local state
      setTracks(prev => prev.map(t => 
        t.id === trackId 
          ? { 
              ...t, 
              isLiked: !t.isLiked,
              likeCount: t.isLiked ? (t.likeCount || 1) - 1 : (t.likeCount || 0) + 1
            }
          : t
      ));

      return true;
    } catch (err) {
      console.error('Error toggling like:', err);
      return false;
    }
  };

  const incrementPlayCount = async (trackId: string) => {
    try {
      await supabase.rpc('increment_play_count', { track_uuid: trackId });
      
      // Update local state
      setTracks(prev => prev.map(t => 
        t.id === trackId 
          ? { ...t, play_count: t.play_count + 1 }
          : t
      ));
    } catch (err) {
      console.error('Error incrementing play count:', err);
    }
  };

  useEffect(() => {
    fetchTracks();
    fetchAlbums();
  }, [user]);

  return {
    tracks,
    albums,
    loading,
    error,
    refetch: () => {
      fetchTracks();
      fetchAlbums();
    },
    toggleLike,
    incrementPlayCount
  };
};