/**
 * AzuraCast Media Module
 * Handles media library operations - files, uploads, metadata
 */

import { apiClient } from '../api-client';
import { supabase } from '@/integrations/supabase/client';
import type { AzuraCastMediaFile, AzuraCastFileEntry, MediaMetadata } from '../types';

/**
 * Get files from a specific path in the media library
 */
export async function getFiles(path: string = '', stationId?: string): Promise<AzuraCastFileEntry[]> {
  return apiClient.request<AzuraCastFileEntry[]>(
    `/station/{stationId}/files?path=${encodeURIComponent(path)}`,
    'GET',
    undefined,
    { stationId }
  );
}

/**
 * Get all media files recursively
 */
export async function getAllMedia(stationId?: string): Promise<AzuraCastFileEntry[]> {
  console.log('AzuraCast: Fetching all media (recursive)');
  
  const listPath = async (path: string) => {
    const qs = path ? `?path=${encodeURIComponent(path)}` : '';
    return apiClient.request<AzuraCastFileEntry[]>(
      `/station/{stationId}/files/list${qs}`,
      'GET',
      undefined,
      { stationId }
    );
  };

  try {
    const visited = new Set<string>();
    const toVisit: string[] = ['/', ''];
    const all: AzuraCastFileEntry[] = [];

    while (toVisit.length > 0) {
      const current = toVisit.shift() ?? '';
      if (visited.has(current)) continue;
      visited.add(current);

      const entries = await listPath(current);
      if (!Array.isArray(entries)) continue;

      for (const entry of entries) {
        const type = String(entry?.type || '').toLowerCase();
        const entryPath = entry?.path;
        const isDir = type === 'dir' || type === 'directory' || entry?.is_dir === true;

        if (isDir && typeof entryPath === 'string') {
          toVisit.push(entryPath);
          continue;
        }

        if (type === 'media' || entry?.media) {
          all.push(entry);
        }
      }
    }

    console.log('AzuraCast: Total media files found:', all.length);
    return all;
  } catch (e) {
    console.warn('AzuraCast: Recursive fetch failed, trying /files:', e);
  }

  // Fallback
  try {
    const files = await apiClient.request<AzuraCastFileEntry[]>(
      `/station/{stationId}/files`,
      'GET',
      undefined,
      { stationId }
    );
    return Array.isArray(files) ? files : [];
  } catch {
    return [];
  }
}

/**
 * Get media file count
 */
export async function getMediaCount(stationId?: string): Promise<number> {
  try {
    const files = await apiClient.request<AzuraCastFileEntry[]>(
      `/station/{stationId}/files/list`,
      'GET',
      undefined,
      { stationId }
    );
    return Array.isArray(files) ? files.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Get single media file details
 */
export async function getMediaFile(fileId: number, stationId?: string): Promise<AzuraCastMediaFile> {
  return apiClient.request<AzuraCastMediaFile>(
    `/station/{stationId}/file/${fileId}`,
    'GET',
    undefined,
    { stationId }
  );
}

/**
 * Search media by title/artist/path
 */
export async function searchMedia(query: string, stationId?: string): Promise<AzuraCastFileEntry[]> {
  console.log('AzuraCast: Searching media for:', query);
  const files = await apiClient.request<AzuraCastFileEntry[]>(
    `/station/{stationId}/files/list`,
    'GET',
    undefined,
    { stationId }
  );
  
  if (!Array.isArray(files)) return [];
  
  const searchLower = query.toLowerCase();
  return files.filter((file) => {
    if (file.type !== 'media') return false;
    const title = file.media?.title?.toLowerCase() || '';
    const artist = file.media?.artist?.toLowerCase() || '';
    const path = file.path?.toLowerCase() || '';
    return title.includes(searchLower) || artist.includes(searchLower) || path.includes(searchLower);
  });
}

/**
 * Update media file metadata
 */
export async function updateMedia(
  fileId: number,
  metadata: MediaMetadata,
  stationId?: string
): Promise<AzuraCastMediaFile> {
  console.log('AzuraCast: Updating media:', fileId, metadata);
  return apiClient.request<AzuraCastMediaFile>(
    `/station/{stationId}/file/${fileId}`,
    'PUT',
    metadata,
    { stationId }
  );
}

/**
 * Delete media file
 */
export async function deleteMedia(fileId: number, stationId?: string): Promise<void> {
  console.log('AzuraCast: Deleting media:', fileId);
  await apiClient.request(
    `/station/{stationId}/file/${fileId}`,
    'DELETE',
    undefined,
    { stationId }
  );
}

/**
 * Add files to a playlist
 */
export async function addToPlaylist(
  playlistId: number,
  fileIds: number[],
  stationId?: string
): Promise<void> {
  const normalizePlaylistIds = (raw: unknown): number[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((p) => (typeof p === 'number' ? p : (p as { id?: number })?.id))
        .filter((id): id is number => typeof id === 'number');
    }
    if (typeof raw === 'object') {
      return Object.values(raw as Record<string, unknown>)
        .map((p) => (typeof p === 'number' ? p : (p as { id?: number })?.id))
        .filter((id): id is number => typeof id === 'number');
    }
    return [];
  };

  const tasks = fileIds.map(async (fileId) => {
    const fileInfo = await apiClient.request<{ playlists?: unknown }>(
      `/station/{stationId}/file/${fileId}`,
      'GET',
      undefined,
      { stationId }
    );
    const currentPlaylists = normalizePlaylistIds(fileInfo?.playlists);
    const nextPlaylists = currentPlaylists.includes(playlistId)
      ? currentPlaylists
      : [...currentPlaylists, playlistId];

    await apiClient.request(
      `/station/{stationId}/file/${fileId}`,
      'PUT',
      { playlists: nextPlaylists },
      { stationId }
    );
  });

  const results = await Promise.allSettled(tasks);
  const failures = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  if (failures.length > 0) {
    console.error('AzuraCast: addToPlaylist failures:', failures);
    throw failures[0].reason;
  }
}

/**
 * Remove a file from a playlist
 */
export async function removeFromPlaylist(
  playlistId: number,
  mediaId: number,
  stationId?: string
): Promise<void> {
  await apiClient.request(
    `/station/{stationId}/playlist/${playlistId}/media/${mediaId}`,
    'DELETE',
    undefined,
    { stationId }
  );
}

/**
 * Upload media from a URL
 */
export async function uploadMediaFromUrl(
  fileUrl: string,
  fileName: string,
  title?: string,
  artist?: string,
  onProgress?: (status: string, progress?: number) => void
): Promise<unknown> {
  console.log('AzuraCast: Uploading media from URL:', fileUrl);
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  onProgress?.('Uploading to radio station...');
  
  const response = await fetch(
    'https://oopmlreysjzuxzylyheb.functions.supabase.co/azuracast-upload-media',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ fileUrl, fileName, title, artist }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Upload failed');
  }

  return response.json();
}
