/**
 * AzuraCast Podcasts Module
 * Handles podcast management
 */

import { apiClient } from '../api-client';

export interface AzuraCastPodcast {
  id: string;
  title: string;
  description: string;
  language: string;
  categories: string[];
  link: string;
  is_enabled: boolean;
}

export interface CreatePodcastData {
  title: string;
  description?: string;
  language?: string;
  categories?: string[];
}

/**
 * Get all podcasts
 */
export async function getPodcasts(stationId?: string): Promise<AzuraCastPodcast[]> {
  return apiClient.request<AzuraCastPodcast[]>(
    `/station/{stationId}/podcasts`,
    'GET',
    undefined,
    { stationId }
  );
}

/**
 * Create a new podcast
 */
export async function createPodcast(
  data: CreatePodcastData,
  stationId?: string
): Promise<AzuraCastPodcast> {
  return apiClient.request<AzuraCastPodcast>(
    `/station/{stationId}/podcasts`,
    'POST',
    data,
    { stationId }
  );
}

/**
 * Delete a podcast
 */
export async function deletePodcast(podcastId: string, stationId?: string): Promise<void> {
  await apiClient.request(
    `/station/{stationId}/podcast/${podcastId}`,
    'DELETE',
    undefined,
    { stationId }
  );
}

/**
 * Get podcast episodes
 */
export async function getPodcastEpisodes(podcastId: string, stationId?: string): Promise<unknown[]> {
  return apiClient.request<unknown[]>(
    `/station/{stationId}/podcast/${podcastId}/episodes`,
    'GET',
    undefined,
    { stationId }
  );
}
