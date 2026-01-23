import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CoursePlaylist {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  playlist_url?: string;
  is_public: boolean;
  is_featured: boolean;
  display_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  track_count?: number;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  music_file_id: string;
  position: number;
  added_by: string;
  added_at: string;
  // Enriched track data
  track_data?: {
    id: string;
    title: string;
    artist?: string;
    audio_url: string;
    duration?: number;
    description?: string;
  };
}

export const useCoursePlaylist = (courseId: string) => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<CoursePlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<CoursePlaylist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all playlists for this course
  const fetchPlaylists = useCallback(async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('gw_course_playlists')
        .select('*')
        .eq('course_id', courseId)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      setPlaylists(data || []);
      
      // Auto-select first playlist if none selected
      if (data && data.length > 0 && !selectedPlaylist) {
        setSelectedPlaylist(data[0]);
      }
    } catch (err) {
      console.error('Error fetching course playlists:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch playlists');
    } finally {
      setLoading(false);
    }
  }, [courseId, selectedPlaylist]);

  // Fetch tracks for selected playlist
  const fetchPlaylistTracks = useCallback(async (playlistId: string) => {
    if (!playlistId) return;

    try {
      setTracksLoading(true);

      // Get playlist media from gw_course_playlist_media with joined media data
      const { data: playlistMedia, error: mediaError } = await supabase
        .from('gw_course_playlist_media')
        .select(`
          id,
          playlist_id,
          media_id,
          position,
          created_at,
          gw_media_library!inner (
            id,
            title,
            file_url,
            file_type,
            category
          )
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (mediaError) throw mediaError;

      // Transform to expected format
      const enrichedTracks: PlaylistTrack[] = (playlistMedia || []).map((item: any) => ({
        id: item.id,
        playlist_id: item.playlist_id,
        music_file_id: item.media_id,
        position: item.position,
        added_by: '',
        added_at: item.created_at,
        track_data: item.gw_media_library ? {
          id: item.gw_media_library.id,
          title: item.gw_media_library.title,
          artist: item.gw_media_library.category,
          audio_url: item.gw_media_library.file_url,
          duration: undefined,
        } : undefined,
      }));

      setTracks(enrichedTracks.filter(t => t.track_data !== undefined));
    } catch (err) {
      console.error('Error fetching playlist tracks:', err);
    } finally {
      setTracksLoading(false);
    }
  }, []);

  // Select a playlist and load its tracks
  const selectPlaylist = useCallback((playlist: CoursePlaylist) => {
    setSelectedPlaylist(playlist);
    fetchPlaylistTracks(playlist.id);
  }, [fetchPlaylistTracks]);

  // Initial load
  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // Load tracks when playlist changes
  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistTracks(selectedPlaylist.id);
    } else {
      setTracks([]);
    }
  }, [selectedPlaylist, fetchPlaylistTracks]);

  return {
    playlists,
    selectedPlaylist,
    tracks,
    loading,
    tracksLoading,
    error,
    selectPlaylist,
    refetch: fetchPlaylists,
  };
};
