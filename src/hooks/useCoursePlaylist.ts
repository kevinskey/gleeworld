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

      // First get the playlist tracks
      const { data: trackData, error: trackError } = await supabase
        .from('gw_playlist_tracks')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (trackError) throw trackError;

      // Now enrich with audio data from multiple possible sources
      const enrichedTracks = await Promise.all(
        (trackData || []).map(async (track) => {
          let audioData = null;

          // Try music_tracks first
          const { data: musicTrack } = await supabase
            .from('music_tracks')
            .select('id, title, artist, audio_url, duration')
            .eq('id', track.music_file_id)
            .single();

          if (musicTrack) {
            audioData = musicTrack;
          } else {
            // Try audio_archive
            const { data: archiveTrack } = await supabase
              .from('audio_archive')
              .select('id, title, artist_info, audio_url, duration_seconds')
              .eq('id', track.music_file_id)
              .single();

            if (archiveTrack) {
              audioData = {
                id: archiveTrack.id,
                title: archiveTrack.title,
                artist: archiveTrack.artist_info,
                audio_url: archiveTrack.audio_url,
                duration: archiveTrack.duration_seconds,
              };
            } else {
              // Try course_audio_resources
              const { data: courseAudio } = await supabase
                .from('course_audio_resources')
                .select('id, title, description, audio_path, duration_seconds')
                .eq('id', track.music_file_id)
                .single();

              if (courseAudio) {
                // Get public URL for storage path
                const { data: urlData } = supabase.storage
                  .from('course-audio')
                  .getPublicUrl(courseAudio.audio_path);

                audioData = {
                  id: courseAudio.id,
                  title: courseAudio.title,
                  description: courseAudio.description,
                  audio_url: urlData.publicUrl,
                  duration: courseAudio.duration_seconds,
                };
              }
            }
          }

          return {
            ...track,
            track_data: audioData,
          };
        })
      );

      setTracks(enrichedTracks.filter(t => t.track_data !== null));
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
