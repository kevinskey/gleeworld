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
  accepting_requests?: boolean;
}

export interface RadioCoTrack {
  title: string;
  start_time?: string;
  artwork_url?: string;
  artwork_url_large?: string;
  artist?: string;
}

export interface RadioCoStationInfo {
  id?: string;
  name?: string;
  logo_url?: string;
  streaming_hostname?: string;
  listen_url?: string;
}

export interface RadioCoNextTrack {
  station_name?: string;
  next_track?: RadioCoTrack;
}

export interface RadioCoScheduleEvent {
  start: string;
  end: string;
  event_id: number;
  playlist?: {
    name: string;
    colour?: string;
    artist?: string;
    title?: string;
    artwork?: string;
  };
}

export interface RadioCoSchedule {
  data: RadioCoScheduleEvent[];
}

export interface RadioCoHistory {
  tracks: RadioCoTrack[];
}

/**
 * Generic proxy function to call Radio.co API endpoints
 */
async function fetchFromProxy<T>(
  endpoint: string,
  stationId: string = DEFAULT_STATION_ID
): Promise<T | null> {
  const { data, error } = await supabase.functions.invoke('radio-status', {
    body: { stationId, endpoint },
  });
  
  if (error) {
    console.warn(`Radio.co ${endpoint} fetch failed:`, error);
    return null;
  }
  
  return data as T;
}

/**
 * Get station status including online/offline and current track
 */
export async function getStatus(stationId: string = DEFAULT_STATION_ID): Promise<RadioCoStatus> {
  const data = await fetchFromProxy<RadioCoStatus>('status', stationId);
  return data || { status: 'offline' };
}

/**
 * Get track history
 */
export async function getHistory(stationId: string = DEFAULT_STATION_ID): Promise<RadioCoTrack[]> {
  const data = await fetchFromProxy<RadioCoHistory>('history', stationId);
  return data?.tracks || [];
}

/**
 * Get next upcoming track
 */
export async function getNextTrack(stationId: string = DEFAULT_STATION_ID): Promise<RadioCoTrack | null> {
  const data = await fetchFromProxy<RadioCoNextTrack>('next', stationId);
  return data?.next_track || null;
}

/**
 * Get 2-week schedule with playlist info
 */
export async function getSchedule(stationId: string = DEFAULT_STATION_ID): Promise<RadioCoScheduleEvent[]> {
  const data = await fetchFromProxy<RadioCoSchedule>('embed/schedule', stationId);
  return data?.data || [];
}

/**
 * Get currently playing show/playlist from schedule
 */
export async function getCurrentShow(stationId: string = DEFAULT_STATION_ID): Promise<RadioCoScheduleEvent | null> {
  const schedule = await getSchedule(stationId);
  const now = new Date();
  
  return schedule.find(event => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return now >= start && now < end;
  }) || null;
}

/**
 * Get upcoming shows from schedule
 */
export async function getUpcomingShows(
  stationId: string = DEFAULT_STATION_ID,
  limit: number = 5
): Promise<RadioCoScheduleEvent[]> {
  const schedule = await getSchedule(stationId);
  const now = new Date();
  
  return schedule
    .filter(event => new Date(event.start) > now)
    .slice(0, limit);
}

/**
 * Get station info
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
 * Get current track (convenience method using status)
 */
export async function getCurrentTrack(stationId: string = DEFAULT_STATION_ID): Promise<RadioCoTrack | null> {
  const status = await getStatus(stationId);
  return status.current_track || null;
}

/**
 * Get the listen URL for a station
 */
export function getListenUrl(stationId: string = DEFAULT_STATION_ID): string {
  return `https://s5.radio.co/${stationId}/listen`;
}

/**
 * Get multiple stream URL options for fallback
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
  getHistory,
  getNextTrack,
  getSchedule,
  getCurrentShow,
  getUpcomingShows,
  getStationInfo,
  getCurrentTrack,
  getListenUrl,
  getStreamUrls,
  DEFAULT_STATION_ID,
};

export default radioCoService;
