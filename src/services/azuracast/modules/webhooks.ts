/**
 * AzuraCast Webhooks Module
 * Handles webhook management
 */

import { apiClient } from '../api-client';

export interface AzuraCastWebhook {
  id: number;
  name: string;
  type: string;
  is_enabled: boolean;
  triggers: string[];
  config: Record<string, unknown>;
}

export interface CreateWebhookData {
  name: string;
  type: string;
  webhook_url?: string;
  triggers?: string[];
  config?: Record<string, unknown>;
}

/**
 * Get all webhooks
 */
export async function getWebhooks(stationId?: string): Promise<AzuraCastWebhook[]> {
  return apiClient.request<AzuraCastWebhook[]>(
    `/station/{stationId}/webhooks`,
    'GET',
    undefined,
    { returnEmptyOnError: true, stationId }
  );
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  data: CreateWebhookData,
  stationId?: string
): Promise<AzuraCastWebhook> {
  return apiClient.request<AzuraCastWebhook>(
    `/station/{stationId}/webhooks`,
    'POST',
    data,
    { stationId }
  );
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  webhookId: number,
  data: Partial<CreateWebhookData>,
  stationId?: string
): Promise<AzuraCastWebhook> {
  return apiClient.request<AzuraCastWebhook>(
    `/station/{stationId}/webhook/${webhookId}`,
    'PUT',
    data,
    { stationId }
  );
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(webhookId: number, stationId?: string): Promise<void> {
  await apiClient.request(
    `/station/{stationId}/webhook/${webhookId}`,
    'DELETE',
    undefined,
    { stationId }
  );
}

/**
 * Test a webhook
 */
export async function testWebhook(webhookId: number, stationId?: string): Promise<void> {
  await apiClient.request(
    `/station/{stationId}/webhook/${webhookId}/test`,
    'POST',
    undefined,
    { stationId }
  );
}
