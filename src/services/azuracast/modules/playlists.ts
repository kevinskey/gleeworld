/**
 * AzuraCast Playlists Module
 * Handles playlist CRUD operations and song requests
 */

import { apiClient } from '../api-client';
import type { 
  AzuraCastPlaylist, 
  CreatePlaylistData, 
  AzuraCastRequestableSong,
  AzuraCastFileEntry 
} from '../types';

/**
 * Get all playlists for a station
 */
export async function getPlaylists(stationId?: string): Promise<AzuraCastPlaylist[]> {
  return apiClient.request<AzuraCastPlaylist[]>(
    `/station/{stationId}/playlists`,
    'GET',
    undefined,
    { returnEmptyOnError: true, stationId }
  );
}

/**
 * Create a new playlist
 */
export async function createPlaylist(
  data: CreatePlaylistData,
  stationId?: string
): Promise<AzuraCastPlaylist> {
  return apiClient.request<AzuraCastPlaylist>(
    `/station/{stationId}/playlists`,
    'POST',
    data,
    { stationId }
  );
}

/**
 * Update an existing playlist
 */
export async function updatePlaylist(
  playlistId: number,
  data: Partial<CreatePlaylistData>,
  stationId?: string
): Promise<AzuraCastPlaylist> {
  return apiClient.request<AzuraCastPlaylist>(
    `/station/{stationId}/playlist/${playlistId}`,
    'PUT',
    data,
    { stationId }
  );
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(playlistId: number, stationId?: string): Promise<void> {
  await apiClient.request(
    `/station/{stationId}/playlist/${playlistId}`,
    'DELETE',
    undefined,
    { stationId }
  );
}

/**
 * Get media files in a specific playlist
 */
export async function getPlaylistMedia(
  playlistId: number,
  stationId?: string
): Promise<AzuraCastFileEntry[]> {
  console.log('AzuraCast: Fetching media for playlist:', playlistId);
  try {
    const allFiles = await apiClient.request<AzuraCastFileEntry[]>(
      `/station/{stationId}/files/list`,
      'GET',
      undefined,
      { stationId }
    );
    
    if (!Array.isArray(allFiles)) return [];
    
    return allFiles.filter((file) => {
      if (file.type !== 'media') return false;
      const playlists = file.media?.playlists || [];
      return playlists.some((p: number | { id: number }) => {
        const pId = typeof p === 'number' ? p : p?.id;
        return pId === playlistId;
      });
    });
  } catch (error) {
    console.error('AzuraCast: Error fetching playlist media:', error);
    return [];
  }
}

/**
 * Get songs that can be requested
 */
export async function getRequestableSongs(stationId?: string): Promise<AzuraCastRequestableSong[]> {
  console.log('AzuraCast: Fetching requestable songs');
  return apiClient.request<AzuraCastRequestableSong[]>(
    `/station/{stationId}/requests`,
    'GET',
    undefined,
    { returnEmptyOnError: true, stationId }
  );
}

/**
 * Submit a song request using request_id
 */
export async function submitSongRequest(requestId: string, stationId?: string): Promise<unknown> {
  console.log('AzuraCast: Submitting song request:', requestId);
  return apiClient.request(
    `/station/{stationId}/request/${requestId}`,
    'POST',
    undefined,
    { stationId }
  );
}

/**
 * Request a random song from a playlist
 * @param playlistId - The playlist to pick from
 * @param excludeIds - Song IDs to skip (for retry logic)
 */
export async function requestSongFromPlaylist(
  playlistId: number,
  excludeIds?: Set<string>,
  stationId?: string
): Promise<{ success: boolean; message: string; song?: { id?: string; title?: string; artist?: string } }> {
  console.log('AzuraCast: Requesting random song from playlist:', playlistId);
  
  try {
    // Get requestable songs
    const requestableSongs = await getRequestableSongs(stationId);
    
    if (Array.isArray(requestableSongs) && requestableSongs.length > 0) {
      // Filter songs that match this playlist
      let playlistSongs = requestableSongs.filter((s) => {
        const playlists = (s.song as unknown as { playlists?: Array<number | { id: number }> })?.playlists || [];
        return playlists.some((p) => {
          const pId = typeof p === 'number' ? p : p?.id;
          return pId === playlistId;
        });
      });
      
      let songsToChooseFrom = playlistSongs.length > 0 ? playlistSongs : requestableSongs;
      
      // Exclude already-tried songs
      if (excludeIds && excludeIds.size > 0) {
        songsToChooseFrom = songsToChooseFrom.filter((s) => {
          const songId = String(s.song?.id || s.request_id || '');
          return !excludeIds.has(songId);
        });
      }
      
      if (songsToChooseFrom.length === 0) {
        return {
          success: false,
          message: 'All available songs have been tried or are on cooldown.',
        };
      }
      
      // Pick a random song
      const randomIndex = Math.floor(Math.random() * songsToChooseFrom.length);
      const randomSong = songsToChooseFrom[randomIndex];
      
      if (randomSong?.request_id) {
        console.log('AzuraCast: Requesting song:', randomSong.song?.title);
        await submitSongRequest(randomSong.request_id, stationId);
        return {
          success: true,
          message: `Requested: ${randomSong.song?.title || 'Unknown'}`,
          song: randomSong.song,
        };
      }
    }
    
    // Fallback: Get playlist media and try to request directly
    const playlistMedia = await getPlaylistMedia(playlistId, stationId);
    if (playlistMedia.length > 0) {
      let availableMedia = playlistMedia;
      if (excludeIds && excludeIds.size > 0) {
        availableMedia = playlistMedia.filter((f) => {
          const mediaId = String(f.media?.id || '');
          return !excludeIds.has(mediaId);
        });
      }
      
      if (availableMedia.length === 0) {
        return {
          success: false,
          message: 'All available songs have been tried or are on cooldown.',
        };
      }
      
      return {
        success: false,
        message: 'No songs available in this playlist. Enable song requests in AzuraCast.',
      };
    }
    
    return {
      success: false,
      message: 'No songs available in this playlist. Enable song requests in AzuraCast.',
    };
  } catch (error) {
    console.error('AzuraCast: Error requesting song:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to request song',
    };
  }
}
