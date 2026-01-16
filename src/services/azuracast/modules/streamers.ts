/**
 * AzuraCast Streamers Module
 * Handles live DJ/streamer management
 */

import { apiClient } from '../api-client';
import type { AzuraCastStreamer, CreateStreamerData } from '../types';

/**
 * Get all streamers for a station
 */
export async function getStreamers(stationId?: string): Promise<AzuraCastStreamer[]> {
  return apiClient.request<AzuraCastStreamer[]>(
    `/station/{stationId}/streamers`,
    'GET',
    undefined,
    { returnEmptyOnError: true, stationId }
  );
}

/**
 * Create a new streamer
 */
export async function createStreamer(
  data: CreateStreamerData,
  stationId?: string
): Promise<AzuraCastStreamer> {
  return apiClient.request<AzuraCastStreamer>(
    `/station/{stationId}/streamers`,
    'POST',
    data,
    { stationId }
  );
}

/**
 * Update a streamer
 */
export async function updateStreamer(
  streamerId: number,
  data: Partial<CreateStreamerData>,
  stationId?: string
): Promise<AzuraCastStreamer> {
  return apiClient.request<AzuraCastStreamer>(
    `/station/{stationId}/streamer/${streamerId}`,
    'PUT',
    data,
    { stationId }
  );
}

/**
 * Delete a streamer
 */
export async function deleteStreamer(streamerId: number, stationId?: string): Promise<void> {
  await apiClient.request(
    `/station/{stationId}/streamer/${streamerId}`,
    'DELETE',
    undefined,
    { stationId }
  );
}
