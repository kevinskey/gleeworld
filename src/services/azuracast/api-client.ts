/**
 * AzuraCast API Client
 * Handles all communication with the AzuraCast API proxy
 */

import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_CONFIG, type AzuraCastConfig } from './types';

export interface ProxyRequestOptions {
  /** Return empty array instead of throwing on error */
  returnEmptyOnError?: boolean;
  /** Override the station ID for this request */
  stationId?: string;
}

export interface ProxyRequestResult<T> {
  data: T | null;
  error: string | null;
  offline: boolean;
}

/**
 * Core API client for AzuraCast proxy requests
 */
export class AzuraCastApiClient {
  private config: AzuraCastConfig;

  constructor(config: Partial<AzuraCastConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get defaultStationId(): string {
    return this.config.defaultStationId;
  }

  get directStreamUrl(): string {
    return this.config.directStreamUrl;
  }

  get proxyBaseUrl(): string {
    return this.config.proxyBaseUrl;
  }

  /**
   * Extract station ID from a stream URL
   * e.g., "/listen/conducting/radio.mp3" -> "conducting"
   */
  extractStationIdFromUrl(streamUrl: string): string | null {
    try {
      const match = streamUrl.match(/\/listen\/([^/]+)\//);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get all available stream URLs (direct + proxied)
   *
   * Radio.co sometimes moves stations between streaming hosts (s3, s5, etc.).
   * If the host we have stored is no longer serving audio, browsers throw:
   * "NotSupportedError: Failed to load because no supported source was found".
   *
   * We pre-compute a small set of host fallbacks and let the player try them.
   */
  getStreamUrls(): string[] {
    const direct = this.config.directStreamUrl;

    const buildRadioCoHostFallbacks = (url: string): string[] => {
      try {
        const u = new URL(url);
        if (!u.hostname.endsWith('radio.co')) return [url];
        if (!u.pathname.includes('/listen')) return [url];

        const hostsToTry = [
          's5.radio.co',
          's4.radio.co',
          's3.radio.co',
          'streaming.radio.co',
          'streamer.radio.co',
          u.hostname,
        ];

        const uniq = new Set<string>();
        for (const host of hostsToTry) {
          const next = new URL(url);
          next.hostname = host;
          uniq.add(next.toString());
        }
        return Array.from(uniq);
      } catch {
        return [url];
      }
    };

    const directCandidates = buildRadioCoHostFallbacks(direct);

    const urls: string[] = [];
    for (const candidate of directCandidates) {
      urls.push(candidate);
      urls.push(`${this.config.proxyBaseUrl}?url=${encodeURIComponent(candidate)}`);
    }

    // De-dupe while preserving order
    return Array.from(new Set(urls));
  }

  /**
   * Make an authenticated request to the AzuraCast API proxy
   */
  async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown,
    options: ProxyRequestOptions = {}
  ): Promise<T> {
    const stationId = options.stationId || this.config.defaultStationId;

    // Check authentication
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.error('AzuraCast API: No active session');
      if (options.returnEmptyOnError) {
        return [] as T;
      }
      throw new Error('Authentication required - please log in');
    }

    let data: unknown;
    let error: Error | null = null;

    try {
      const result = await supabase.functions.invoke('radioco-api-proxy', {
        body: { endpoint, method, body, stationId },
      });
      data = result.data;
      error = result.error;
    } catch (e) {
      console.error('AzuraCast API: Request failed:', e);
      if (options.returnEmptyOnError) {
        return [] as T;
      }
      throw e;
    }

    // Handle errors from the proxy
    if (error) {
      console.error('AzuraCast API: Proxy error:', error);
      const errorMessage = this.extractErrorMessage(data, error);
      if (options.returnEmptyOnError) {
        return [] as T;
      }
      throw new Error(errorMessage);
    }

    // Check for error responses in the data
    if (this.isErrorResponse(data)) {
      console.error('AzuraCast API: Error in response:', data);
      
      if (options.returnEmptyOnError) {
        return [] as T;
      }
      
      const errorData = data as { error?: string; details?: string; message?: string; type?: string };
      throw new Error(
        errorData.error || errorData.message || 'Unknown API error'
      );
    }

    return data as T;
  }

  /**
   * Check if the response indicates an error
   */
  private isErrorResponse(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    
    // Check for explicit error property
    if ('error' in obj && obj.error) return true;
    
    // Check for AzuraCast error format
    if ('code' in obj && 'type' in obj && 'message' in obj) return true;
    
    return false;
  }

  /**
   * Extract a user-friendly error message
   */
  private extractErrorMessage(data: unknown, error: Error): string {
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (obj.error) {
        return `${obj.error}${obj.details ? ` ${obj.details}` : ''}`;
      }
    }
    return error.message || 'Unknown error';
  }
}

// Default singleton instance
export const apiClient = new AzuraCastApiClient();
