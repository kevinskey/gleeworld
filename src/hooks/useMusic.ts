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
      console.log('useMusic: Starting to fetch tracks from ALL sources');

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );

      // Fetch tracks from multiple sources with timeout
      const fetchPromise = Promise.all([
        // Music tracks table
        supabase
          .from('music_tracks')
          .select(`
            *,
            album:music_albums(title, cover_image_url)
          `)
          .order('created_at', { ascending: false }),
        
        // Audio archive table  
        supabase
          .from('audio_archive')
          .select('*')
          .not('audio_url', 'is', null)
          .order('created_at', { ascending: false }),
          
        // Alumnae audio stories
        supabase
          .from('alumnae_audio_stories')
          .select('*')
          .not('audio_url', 'is', null)
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
      ]);

      const [musicTracksResult, audioArchiveResult, alumnaeAudioResult] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      const allTracks: Track[] = [];

      // Process music tracks
      if (musicTracksResult.data) {
        musicTracksResult.data.forEach((track: any) => {
          allTracks.push({
            id: track.id,
            title: track.title,
            artist: track.artist || 'Glee Club',
            audio_url: track.audio_url,
            duration: track.duration || 180,
            album_id: track.album_id,
            album: track.album,
            play_count: track.play_count || 0,
            isLiked: false,
            likeCount: 0
          });
        });
      }

      // Process audio archive tracks
      if (audioArchiveResult.data) {
        audioArchiveResult.data.forEach((track: any) => {
          allTracks.push({
            id: `archive_${track.id}`,
            title: track.title,
            artist: track.artist_info || 'Glee Club',
            audio_url: track.audio_url,
            duration: track.duration_seconds || 180,
            play_count: track.play_count || 0,
            isLiked: false,
            likeCount: 0
          });
        });
      }

      // Process alumnae audio stories
      if (alumnaeAudioResult.data) {
        alumnaeAudioResult.data.forEach((track: any) => {
          allTracks.push({
            id: `alumni_${track.id}`,
            title: track.title,
            artist: 'Alumnae Story',
            audio_url: track.audio_url,
            duration: track.duration_seconds || 300,
            play_count: 0,
            isLiked: false,
            likeCount: 0
          });
        });
      }

      console.log('useMusic: Total tracks from all sources:', allTracks.length);

      if (allTracks.length > 0) {
        // Only fetch likes for music_tracks (not for archive or alumnae tracks)
        if (user) {
          try {
            const { data: likesData } = await supabase
              .from('track_likes')
              .select('track_id')
              .eq('user_id', user.id);
            
            const userLikes = likesData?.map(like => like.track_id) || [];
            
            const enrichedTracks: Track[] = allTracks.map(track => ({
              ...track,
              isLiked: userLikes.includes(track.id),
              likeCount: 0 // Skip complex like count fetching for now
            }));

            setTracks(enrichedTracks);
          } catch (likeError) {
            console.warn('useMusic: Error fetching likes, using basic tracks:', likeError);
            setTracks(allTracks);
          }
        } else {
          setTracks(allTracks);
        }
      }
      
      console.log('useMusic: All tracks fetch completed successfully');
    } catch (err) {
      console.error('useMusic: Error fetching tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tracks');
      // Don't leave tracks empty on error - try to show cached data
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