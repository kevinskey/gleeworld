/**
 * AzuraCast Reports Module
 * Handles analytics and reports
 */

import { apiClient } from '../api-client';

/**
 * Get listener report for a date range
 */
export async function getListenerReport(
  startDate?: string,
  endDate?: string,
  stationId?: string
): Promise<unknown> {
  let endpoint = `/station/{stationId}/reports/listeners`;
  const params: string[] = [];
  if (startDate) params.push(`start=${startDate}`);
  if (endDate) params.push(`end=${endDate}`);
  if (params.length) endpoint += `?${params.join('&')}`;
  
  return apiClient.request(endpoint, 'GET', undefined, { stationId });
}

/**
 * Get performance report
 */
export async function getPerformanceReport(stationId?: string): Promise<unknown> {
  return apiClient.request(`/station/{stationId}/reports/performance`, 'GET', undefined, { stationId });
}

/**
 * Get song request report
 */
export async function getSongRequestReport(stationId?: string): Promise<unknown> {
  return apiClient.request(`/station/{stationId}/reports/requests`, 'GET', undefined, { stationId });
}
