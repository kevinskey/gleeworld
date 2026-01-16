/**
 * AzuraCast Mounts Module
 * Handles mount point and HLS stream management
 */

import { apiClient } from '../api-client';

export interface AzuraCastMount {
  id: number;
  name: string;
  display_name: string;
  is_visible_on_public_pages: boolean;
  is_default: boolean;
  relay_url: string | null;
  enable_autodj: boolean;
  autodj_format: string;
  autodj_bitrate: number;
  listeners_unique: number;
  listeners_total: number;
}

export interface CreateMountData {
  name: string;
  display_name?: string;
  is_visible_on_public_pages?: boolean;
  is_default?: boolean;
  relay_url?: string;
  enable_autodj?: boolean;
  autodj_format?: string;
  autodj_bitrate?: number;
}

/**
 * Get all mount points
 */
export async function getMounts(stationId?: string): Promise<AzuraCastMount[]> {
  return apiClient.request<AzuraCastMount[]>(
    `/station/{stationId}/mounts`,
    'GET',
    undefined,
    { returnEmptyOnError: true, stationId }
  );
}

/**
 * Create a new mount point
 */
export async function createMount(data: CreateMountData, stationId?: string): Promise<AzuraCastMount> {
  return apiClient.request<AzuraCastMount>(
    `/station/{stationId}/mounts`,
    'POST',
    data,
    { stationId }
  );
}

/**
 * Update a mount point
 */
export async function updateMount(
  mountId: number,
  data: Partial<CreateMountData>,
  stationId?: string
): Promise<AzuraCastMount> {
  return apiClient.request<AzuraCastMount>(
    `/station/{stationId}/mount/${mountId}`,
    'PUT',
    data,
    { stationId }
  );
}

/**
 * Delete a mount point
 */
export async function deleteMount(mountId: number, stationId?: string): Promise<void> {
  await apiClient.request(
    `/station/{stationId}/mount/${mountId}`,
    'DELETE',
    undefined,
    { stationId }
  );
}

/**
 * Get HLS streams
 */
export async function getHlsStreams(stationId?: string): Promise<unknown[]> {
  return apiClient.request<unknown[]>(
    `/station/{stationId}/hls_streams`,
    'GET',
    undefined,
    { stationId }
  );
}

/**
 * Get remote relays
 */
export async function getRemoteRelays(stationId?: string): Promise<unknown[]> {
  return apiClient.request<unknown[]>(
    `/station/{stationId}/remotes`,
    'GET',
    undefined,
    { stationId }
  );
}

export interface CreateRemoteRelayData {
  display_name: string;
  url: string;
  mount?: string;
  enable_autodj?: boolean;
  autodj_format?: string;
  autodj_bitrate?: number;
}

/**
 * Create a remote relay
 */
export async function createRemoteRelay(
  data: CreateRemoteRelayData,
  stationId?: string
): Promise<unknown> {
  return apiClient.request(
    `/station/{stationId}/remotes`,
    'POST',
    data,
    { stationId }
  );
}

/**
 * Delete a remote relay
 */
export async function deleteRemoteRelay(relayId: number, stationId?: string): Promise<void> {
  await apiClient.request(
    `/station/{stationId}/remote/${relayId}`,
    'DELETE',
    undefined,
    { stationId }
  );
}
