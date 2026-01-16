/**
 * AzuraCast Station Control Module
 * Handles station power, restart, and backend/frontend control
 */

import { apiClient } from '../api-client';
import type { CreateScheduleData, AzuraCastScheduleEntry } from '../types';

// ============= Station Restart =============

/**
 * Restart the entire station
 */
export async function restartStation(stationId?: string): Promise<void> {
  await apiClient.request(`/station/{stationId}/restart`, 'POST', undefined, { stationId });
}

// ============= Backend (AutoDJ) Control =============

/**
 * Start the station backend (AutoDJ)
 */
export async function startBackend(stationId?: string): Promise<void> {
  console.log('AzuraCast: Starting backend');
  await apiClient.request(`/station/{stationId}/backend/start`, 'POST', undefined, { stationId });
}

/**
 * Stop the station backend (AutoDJ)
 */
export async function stopBackend(stationId?: string): Promise<void> {
  console.log('AzuraCast: Stopping backend');
  await apiClient.request(`/station/{stationId}/backend/stop`, 'POST', undefined, { stationId });
}

/**
 * Restart the station backend (AutoDJ)
 */
export async function restartBackend(stationId?: string): Promise<void> {
  console.log('AzuraCast: Restarting backend');
  await apiClient.request(`/station/{stationId}/backend/restart`, 'POST', undefined, { stationId });
}

/**
 * Skip to the next track
 */
export async function skipTrack(stationId?: string): Promise<void> {
  console.log('AzuraCast: Skipping track');
  await apiClient.request(`/station/{stationId}/backend/skip`, 'POST', undefined, { stationId });
}

// ============= Frontend (Stream) Control =============

/**
 * Start the station frontend (stream)
 */
export async function startFrontend(stationId?: string): Promise<void> {
  console.log('AzuraCast: Starting frontend');
  await apiClient.request(`/station/{stationId}/frontend/start`, 'POST', undefined, { stationId });
}

/**
 * Stop the station frontend (stream)
 */
export async function stopFrontend(stationId?: string): Promise<void> {
  console.log('AzuraCast: Stopping frontend');
  await apiClient.request(`/station/{stationId}/frontend/stop`, 'POST', undefined, { stationId });
}

/**
 * Restart the station frontend (stream)
 */
export async function restartFrontend(stationId?: string): Promise<void> {
  console.log('AzuraCast: Restarting frontend');
  await apiClient.request(`/station/{stationId}/frontend/restart`, 'POST', undefined, { stationId });
}

// ============= Station Configuration =============

/**
 * Get station configuration
 */
export async function getStationConfig(stationId?: string): Promise<unknown> {
  return apiClient.request(`/station/{stationId}`, 'GET', undefined, { stationId });
}

/**
 * Update station configuration
 */
export async function updateStationConfig(
  config: {
    name?: string;
    description?: string;
    genre?: string;
    url?: string;
    timezone?: string;
    enable_public_page?: boolean;
    enable_on_demand?: boolean;
    default_album_art_url?: string;
  },
  stationId?: string
): Promise<unknown> {
  return apiClient.request(`/station/{stationId}`, 'PUT', config, { stationId });
}

// ============= Schedule =============

/**
 * Get station schedule
 */
export async function getSchedule(stationId?: string): Promise<AzuraCastScheduleEntry[]> {
  return apiClient.request<AzuraCastScheduleEntry[]>(
    `/station/{stationId}/schedule`,
    'GET',
    undefined,
    { returnEmptyOnError: true, stationId }
  );
}

/**
 * Create a schedule entry
 */
export async function createScheduleEntry(
  data: CreateScheduleData,
  stationId?: string
): Promise<AzuraCastScheduleEntry> {
  return apiClient.request<AzuraCastScheduleEntry>(
    `/station/{stationId}/schedule`,
    'POST',
    data,
    { stationId }
  );
}

/**
 * Update a schedule entry
 */
export async function updateScheduleEntry(
  scheduleId: number,
  data: Partial<CreateScheduleData>,
  stationId?: string
): Promise<AzuraCastScheduleEntry> {
  return apiClient.request<AzuraCastScheduleEntry>(
    `/station/{stationId}/schedule/${scheduleId}`,
    'PUT',
    data,
    { stationId }
  );
}

/**
 * Delete a schedule entry
 * Note: AzuraCast manages schedule through playlists
 */
export async function deleteScheduleEntry(scheduleId: number): Promise<void> {
  throw new Error(
    'Schedule items are managed through playlist settings in AzuraCast. ' +
    'Delete the playlist or modify its schedule settings instead.'
  );
}
