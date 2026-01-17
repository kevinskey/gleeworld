/**
 * Radio.co Service
 * Public API integration for GleeWorld Radio
 * Station ID: sd0d2e77cf
 */

import { supabase } from "@/integrations/supabase/client";

const DEFAULT_STATION_ID = 'sd0d2e77cf';

export interface RadioCoStatus {
  status: 'online' | 'offline';
  source?: {
    type: string;
    collaborator?: unknown;
    relay?: unknown;
  };
  collaborators?: unknown[];
  relays?: unknown[];
  current_track?: RadioCoTrack;
  history?: RadioCoTrack[];
  logo_url?: string;
  streaming_hostname?: string;
  outputs?: unknown[];
}

export interface RadioCoTrack {
  title: string;
  start_time?: string;
  artwork_url?: string;
  artwork_url_large?: string;
}

export interface RadioCoStationInfo {
  id?: string;
  name?: string;
  logo_url?: string;
  streaming_hostname?: string;
  listen_url?: string;
}

/**
 * Get station status including online/offline and current track
 * Uses edge function proxy to avoid CSP issues
 */
export async function getStatus(stationId: string = DEFAULT_STATION_ID): Promise<RadioCoStatus> {
  const { data, error } = await supabase.functions.invoke('radio-status', {
    body: { stationId },
  });
  
  if (error) {
    console.warn('Radio status fetch failed:', error);
    return { status: 'offline' };
  }
  
  return data as RadioCoStatus;
}

/**
 * Get station info
 * GET https://public.radio.co/api/v2/{stationId}
 */
export async function getStationInfo(stationId: string = DEFAULT_STATION_ID): Promise<RadioCoStationInfo> {
  const response = await fetch(`https://public.radio.co/api/v2/${stationId}`, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Radio.co station info API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get current track
 * GET https://public.radio.co/api/v2/{stationId}/track/current
 */
export async function getCurrentTrack(stationId: string = DEFAULT_STATION_ID): Promise<RadioCoTrack | null> {
  try {
    const response = await fetch(`https://public.radio.co/api/v2/${stationId}/track/current`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn('Radio.co current track API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data?.data || data || null;
  } catch (error) {
    console.warn('Failed to fetch current track:', error);
    return null;
  }
}

/**
 * Get the listen URL for a station
 * Radio.co uses s5.radio.co for the main stream
 */
export function getListenUrl(stationId: string = DEFAULT_STATION_ID): string {
  return `https://s5.radio.co/${stationId}/listen`;
}

/**
 * Get multiple stream URL options for fallback
 * Radio.co streams are available on various CDN endpoints
 */
export function getStreamUrls(stationId: string = DEFAULT_STATION_ID): string[] {
  return [
    `https://s5.radio.co/${stationId}/listen`,
    `https://streaming.radio.co/${stationId}/listen`,
    `https://s2.radio.co/${stationId}/listen`,
    `https://s3.radio.co/${stationId}/listen`,
    `https://s4.radio.co/${stationId}/listen`,
  ];
}

// Default service object for convenience
export const radioCoService = {
  getStatus,
  getStationInfo,
  getCurrentTrack,
  getListenUrl,
  getStreamUrls,
  DEFAULT_STATION_ID,
};

export default radioCoService;
