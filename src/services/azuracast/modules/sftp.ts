/**
 * AzuraCast SFTP Module
 * Handles SFTP user management
 */

import { apiClient } from '../api-client';

export interface AzuraCastSftpUser {
  id: number;
  username: string;
  public_keys: string;
}

export interface CreateSftpUserData {
  username: string;
  password: string;
  public_keys?: string;
}

/**
 * Get all SFTP users
 */
export async function getSftpUsers(stationId?: string): Promise<AzuraCastSftpUser[]> {
  return apiClient.request<AzuraCastSftpUser[]>(
    `/station/{stationId}/sftp-users`,
    'GET',
    undefined,
    { returnEmptyOnError: true, stationId }
  );
}

/**
 * Create a new SFTP user
 */
export async function createSftpUser(
  data: CreateSftpUserData,
  stationId?: string
): Promise<AzuraCastSftpUser> {
  return apiClient.request<AzuraCastSftpUser>(
    `/station/{stationId}/sftp-users`,
    'POST',
    data,
    { stationId }
  );
}

/**
 * Delete an SFTP user
 */
export async function deleteSftpUser(userId: number, stationId?: string): Promise<void> {
  await apiClient.request(
    `/station/{stationId}/sftp-user/${userId}`,
    'DELETE',
    undefined,
    { stationId }
  );
}
