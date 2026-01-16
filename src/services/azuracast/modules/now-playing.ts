/**
 * AzuraCast Now Playing Module
 * Handles fetching current playback state, history, and station status
 */

import { apiClient } from '../api-client';
import type { 
  AzuraCastNowPlaying, 
  AzuraCastStation, 
  AzuraCastSongHistory,
  AzuraCastListener
} from '../types';

/**
 * Fetch now playing data for a station
 * Uses the edge function proxy to avoid CORS issues with direct browser requests.
 */
export async function getNowPlaying(stationId?: string): Promise<AzuraCastNowPlaying | null> {
  const targetStation = stationId || apiClient.defaultStationId;
  try {
    console.log('AzuraCast: Fetching now playing for station:', targetStation);
    // Use the proxy - nowplaying endpoint path includes station ID directly
    return await apiClient.request<AzuraCastNowPlaying>(
      `/nowplaying/${targetStation}`,
      'GET',
      undefined,
      { returnEmptyOnError: false }
    );
  } catch (error) {
    console.error('AzuraCast: Failed to fetch now playing:', error);
    return null;
  }
}

/**
 * Fetch station information
 */
export async function getStationInfo(stationId?: string): Promise<AzuraCastStation | null> {
  const targetStation = stationId || apiClient.defaultStationId;
  try {
    console.log('AzuraCast: Fetching station info for:', targetStation);
    return await apiClient.request<AzuraCastStation>(`/station/${targetStation}`);
  } catch (error) {
    console.error('AzuraCast: Failed to fetch station info:', error);
    return null;
  }
}

/**
 * Fetch all stations from AzuraCast
 */
export async function getAllStations(): Promise<AzuraCastStation[]> {
  try {
    console.log('AzuraCast: Fetching all stations');
    const data = await apiClient.request<AzuraCastStation[]>('/stations');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('AzuraCast: Failed to fetch stations:', error);
    return [];
  }
}

/**
 * Fetch song history for a station
 */
export async function getSongHistory(stationId?: string): Promise<AzuraCastSongHistory[]> {
  return apiClient.request<AzuraCastSongHistory[]>(
    `/station/{stationId}/history`,
    'GET',
    undefined,
    { returnEmptyOnError: true, stationId }
  );
}

/**
 * Get station status/health
 */
export async function getStationStatus(stationId?: string): Promise<unknown> {
  return apiClient.request(`/station/{stationId}/status`, 'GET', undefined, { stationId });
}

/**
 * Get listener count and details
 */
export async function getListeners(stationId?: string): Promise<AzuraCastListener[]> {
  return apiClient.request<AzuraCastListener[]>(
    `/station/{stationId}/listeners`,
    'GET',
    undefined,
    { returnEmptyOnError: true, stationId }
  );
}

/**
 * Disconnect a specific listener
 */
export async function disconnectListener(listenerId: number, stationId?: string): Promise<void> {
  await apiClient.request(
    `/station/{stationId}/listener/${listenerId}/disconnect`,
    'POST',
    undefined,
    { stationId }
  );
}
