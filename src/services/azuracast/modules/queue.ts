/**
 * AzuraCast Queue Module
 * Handles queue management and song requests
 */

import { apiClient } from '../api-client';
import type { AzuraCastQueueItem, AzuraCastMediaFile, AzuraCastRequestableSong } from '../types';

/**
 * Get the current queue
 */
export async function getQueue(stationId?: string): Promise<AzuraCastQueueItem[]> {
  console.log('AzuraCast: Fetching queue');
  return apiClient.request<AzuraCastQueueItem[]>(
    `/station/{stationId}/queue`,
    'GET',
    undefined,
    { returnEmptyOnError: true, stationId }
  );
}

/**
 * Remove an item from the queue
 */
export async function removeFromQueue(queueItemId: number, stationId?: string): Promise<void> {
  console.log('AzuraCast: Removing from queue:', queueItemId);
  await apiClient.request(
    `/station/{stationId}/queue/${queueItemId}`,
    'DELETE',
    undefined,
    { stationId }
  );
}

/**
 * Clear all items from the queue
 */
export async function clearQueue(stationId?: string): Promise<void> {
  console.log('AzuraCast: Clearing queue');
  const queue = await getQueue(stationId);
  for (const item of queue) {
    if (item.id) {
      await removeFromQueue(item.id, stationId);
    }
  }
}

/**
 * Get a single media file
 */
async function getMediaFile(fileId: number, stationId?: string): Promise<AzuraCastMediaFile> {
  return apiClient.request<AzuraCastMediaFile>(
    `/station/{stationId}/file/${fileId}`,
    'GET',
    undefined,
    { stationId }
  );
}

/**
 * Get requestable songs
 */
async function getRequestableSongsLocal(stationId?: string): Promise<AzuraCastRequestableSong[]> {
  return apiClient.request<AzuraCastRequestableSong[]>(
    `/station/{stationId}/requests`,
    'GET',
    undefined,
    { returnEmptyOnError: true, stationId }
  );
}

/**
 * Request a song by media ID
 */
export async function requestSong(
  mediaId: number,
  title?: string,
  stationId?: string
): Promise<unknown> {
  console.log('AzuraCast: Requesting song:', mediaId, title);

  if (!title) {
    try {
      const mediaFile = await getMediaFile(mediaId, stationId);
      title = mediaFile?.title || `Media ${mediaId}`;
    } catch {
      title = `Media ${mediaId}`;
    }
  }

  const requestableSongs = await getRequestableSongsLocal(stationId);
  if (!Array.isArray(requestableSongs) || requestableSongs.length === 0) {
    throw new Error('No requestable songs are available on this station.');
  }

  const normalize = (t: string) =>
    (t || '')
      .toLowerCase()
      .trim()
      .replace(/\.(mp3|wav|ogg|flac|m4a|aac)$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const searchTitle = normalize(title);

  const match = requestableSongs.find((s) => {
    const songTitle = normalize(s?.song?.title || '');
    if (!songTitle) return false;
    return songTitle === searchTitle || songTitle.includes(searchTitle) || searchTitle.includes(songTitle);
  });

  if (!match?.request_id) {
    throw new Error(`"${title}" isn't requestable right now.`);
  }

  return apiClient.request(
    `/station/{stationId}/request/${match.request_id}`,
    'POST',
    undefined,
    { stationId }
  );
}
