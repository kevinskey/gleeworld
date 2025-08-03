import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  is_public: boolean;
  created_by: string;
  created_at: string;
  track_count?: number;
}

interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  track_source: string;
  position: number;
  added_at: string;
  track_data?: any; // Full track data from music_tracks or audio_archive
}

export const useRadioPlaylists = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylists = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch playlists with track counts
      const { data: playlistsData, error: playlistsError } = await supabase
        .from('radio_playlists')
        .select(`
          *,
          track_count:radio_playlist_tracks(count)
        `)
        .order('created_at', { ascending: false });

      if (playlistsError) throw playlistsError;

      // Transform the data to include track counts
      const transformedPlaylists = playlistsData?.map(playlist => ({
        ...playlist,
        track_count: Array.isArray(playlist.track_count) ? playlist.track_count.length : 0
      })) || [];

      setPlaylists(transformedPlaylists);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch playlists');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylistTracks = async (playlistId: string) => {
    if (!playlistId) return;

    try {
      const { data: tracksData, error: tracksError } = await supabase
        .from('radio_playlist_tracks')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (tracksError) throw tracksError;

      // Fetch full track data for each track
      const enrichedTracks = await Promise.all(
        (tracksData || []).map(async (track) => {
          let trackData = null;
          
          if (track.track_source === 'music_tracks') {
            const { data } = await supabase
              .from('music_tracks')
              .select('*')
              .eq('id', track.track_id)
              .single();
            trackData = data;
          } else if (track.track_source === 'audio_archive') {
            const { data } = await supabase
              .from('audio_archive')
              .select('*')
              .eq('id', track.track_id)
              .single();
            trackData = data;
          }

          return {
            ...track,
            track_data: trackData
          };
        })
      );

      setPlaylistTracks(enrichedTracks);
    } catch (err) {
      console.error('Error fetching playlist tracks:', err);
    }
  };

  const addTrackToPlaylist = async (playlistId: string, track: any, source: 'music_tracks' | 'audio_archive' = 'music_tracks') => {
    if (!user) return false;

    try {
      // Get the current max position
      const { data: maxPositionData } = await supabase
        .from('radio_playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const nextPosition = (maxPositionData?.position || 0) + 1;

      const { error } = await supabase
        .from('radio_playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: track.id,
          track_source: source,
          position: nextPosition,
          added_by: user.id
        });

      if (error) throw error;

      // Refresh playlist tracks if this is the currently selected playlist
      if (selectedPlaylist?.id === playlistId) {
        await fetchPlaylistTracks(playlistId);
      }

      // Refresh playlists to update track counts
      await fetchPlaylists();

      return true;
    } catch (err) {
      console.error('Error adding track to playlist:', err);
      return false;
    }
  };

  const removeTrackFromPlaylist = async (playlistTrackId: string) => {
    try {
      const { error } = await supabase
        .from('radio_playlist_tracks')
        .delete()
        .eq('id', playlistTrackId);

      if (error) throw error;

      // Refresh current playlist tracks
      if (selectedPlaylist) {
        await fetchPlaylistTracks(selectedPlaylist.id);
      }

      // Refresh playlists to update track counts
      await fetchPlaylists();

      return true;
    } catch (err) {
      console.error('Error removing track from playlist:', err);
      return false;
    }
  };

  const updatePlaylistTrackPositions = async (playlistId: string, trackUpdates: { id: string; position: number }[]) => {
    try {
      // Update positions in batch
      const updates = trackUpdates.map(({ id, position }) => 
        supabase
          .from('radio_playlist_tracks')
          .update({ position })
          .eq('id', id)
      );

      await Promise.all(updates);

      // Refresh playlist tracks
      await fetchPlaylistTracks(playlistId);

      return true;
    } catch (err) {
      console.error('Error updating track positions:', err);
      return false;
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('radio_playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      // Clear selection if deleted playlist was selected
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
        setPlaylistTracks([]);
      }

      // Refresh playlists
      await fetchPlaylists();

      return true;
    } catch (err) {
      console.error('Error deleting playlist:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [user]);

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistTracks(selectedPlaylist.id);
    } else {
      setPlaylistTracks([]);
    }
  }, [selectedPlaylist]);

  return {
    playlists,
    selectedPlaylist,
    playlistTracks,
    loading,
    error,
    setSelectedPlaylist,
    fetchPlaylists,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    updatePlaylistTrackPositions,
    deletePlaylist
  };
};