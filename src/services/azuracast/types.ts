/**
 * AzuraCast API Types
 * Core type definitions for the AzuraCast integration
 */

// ============= Station Types =============

export interface AzuraCastStation {
  id: number;
  name: string;
  shortcode: string;
  short_name?: string;
  description: string;
  frontend: string;
  backend: string;
  listen_url: string;
  is_public: boolean;
  mounts: AzuraCastStationMount[];
  remotes: unknown[];
}

/** Mount as returned in station.mounts (simplified) */
export interface AzuraCastStationMount {
  id: number;
  name: string;
  url: string;
  bitrate: number;
  format: string;
  listeners: ListenerCount;
}

export interface ListenerCount {
  current: number;
  unique: number;
  total: number;
}

// ============= Now Playing Types =============

export interface AzuraCastSong {
  id: string;
  text: string;
  artist: string;
  title: string;
  album: string;
  genre: string;
  lyrics: string;
  art: string;
  custom_fields: unknown[];
}

export interface AzuraCastNowPlayingTrack {
  duration: number;
  playlist: string;
  streamer: string;
  elapsed: number;
  remaining: number;
  sh_id: number;
  song: AzuraCastSong;
}

export interface AzuraCastPlayingNext {
  duration: number;
  playlist: string;
  streamer: string;
  sh_id: number;
  song: AzuraCastSong;
}

export interface AzuraCastSongHistory {
  duration: number;
  playlist: string;
  streamer: string;
  played_at: number;
  sh_id: number;
  song: AzuraCastSong;
}

export interface AzuraCastLiveStatus {
  is_live: boolean;
  streamer_name?: string;
}

export interface AzuraCastNowPlaying {
  station: AzuraCastStation;
  listeners: ListenerCount;
  live: AzuraCastLiveStatus;
  now_playing: AzuraCastNowPlayingTrack;
  playing_next: AzuraCastPlayingNext;
  song_history: AzuraCastSongHistory[];
  cache: string;
}

// ============= Playlist Types =============

export interface AzuraCastPlaylist {
  id: number;
  name: string;
  description?: string;
  type: 'default' | 'scheduled' | 'once_per_x_songs' | 'once_per_x_minutes';
  source: string;
  order: string;
  is_enabled: boolean;
  is_jingle: boolean;
  weight: number;
  include_in_automation: boolean;
  short_name: string;
  num_songs: number;
  total_length: number;
}

export interface CreatePlaylistData {
  name: string;
  description?: string;
  is_enabled?: boolean;
  type?: 'default' | 'scheduled' | 'once_per_x_songs' | 'once_per_x_minutes';
  weight?: number;
}

// ============= Media Types =============

export interface AzuraCastMediaFile {
  id: number;
  unique_id: string;
  song_id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  lyrics: string;
  isrc: string;
  length: number;
  length_text: string;
  art_updated_at: number;
  playlists: number[] | { id: number }[];
}

export interface AzuraCastFileEntry {
  type: 'file' | 'dir' | 'media' | 'directory';
  path: string;
  is_dir?: boolean;
  id?: number;
  media?: AzuraCastMediaFile;
}

export interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
}

// Upload result from the upload edge function
export interface MediaUploadResult {
  id?: number;
  mediaId?: number;
  media_id?: number;
  success?: boolean;
  message?: string;
}

// ============= Streamer Types =============

export interface AzuraCastStreamer {
  id: number;
  streamer_username: string;
  display_name: string;
  comments: string;
  is_active: boolean;
  enforce_schedule: boolean;
  reactivate_at: number | null;
}

export interface CreateStreamerData {
  streamer_username: string;
  streamer_password: string;
  display_name?: string;
  comments?: string;
  is_active?: boolean;
  enforce_schedule?: boolean;
}

// ============= Queue Types =============

export interface AzuraCastQueueItem {
  id: number;
  song: AzuraCastSong;
  cued_at: number;
  played_at: number | null;
  duration: number;
  playlist: string;
  is_request: boolean;
  source: string;
}

export interface AzuraCastRequestableSong {
  request_id: string;
  song: AzuraCastSong;
  request_url: string;
}

// ============= Schedule Types =============

export interface AzuraCastScheduleEntry {
  id: number;
  type: string;
  name: string;
  start_time: string;
  end_time: string;
  start_date: string | null;
  end_date: string | null;
  days: number[];
}

export interface CreateScheduleData {
  name: string;
  playlist_id?: number;
  streamer_id?: number;
  start_time: string;
  end_time: string;
  start_date?: string;
  end_date?: string;
  days?: number[];
}

// ============= Station Config Types =============

export interface AzuraCastStationConfig {
  id: number;
  name: string;
  shortcode: string;
  description: string;
  frontend: string;
  backend: string;
  genre: string;
  url: string;
  timezone: string;
  enable_public_page: boolean;
  enable_on_demand: boolean;
  default_album_art_url: string | null;
}

// ============= Listener Types =============

export interface AzuraCastListener {
  id: number;
  ip: string;
  user_agent: string;
  mount_id: number;
  mount_name: string;
  mount_is_local: boolean;
  connected_on: number;
  connected_time: number;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    lat?: number;
    lon?: number;
  };
}

// ============= Remote Relay Types =============

export interface AzuraCastRemoteRelay {
  id: number;
  display_name: string;
  url: string;
  mount?: string;
  is_visible_on_public_pages: boolean;
  enable_autodj?: boolean;
  autodj_format?: string;
  autodj_bitrate?: number;
}

// ============= API Response Types =============

export interface AzuraCastApiError {
  error: string;
  details?: string;
  success: false;
  offline?: boolean;
  upstream_status?: number;
}

export interface AzuraCastApiSuccess<T> {
  data: T;
  success: true;
}

export type AzuraCastApiResponse<T> = AzuraCastApiSuccess<T> | AzuraCastApiError;

// ============= Configuration =============

export interface AzuraCastConfig {
  baseUrl: string;
  defaultStationId: string;
  directStreamUrl: string;
  proxyBaseUrl: string;
  apiProxyUrl: string;
}

export const DEFAULT_CONFIG: AzuraCastConfig = {
  baseUrl: 'https://streamer.radio.co',
  defaultStationId: 'sd0d2e77cf',
  directStreamUrl: 'https://streamer.radio.co/sd0d2e77cf/listen',
  proxyBaseUrl: 'https://oopmlreysjzuxzylyheb.functions.supabase.co/radio-proxy',
  apiProxyUrl: 'https://oopmlreysjzuxzylyheb.functions.supabase.co/radioco-api-proxy',
};

// Radio.co specific types
export interface RadioCoStatus {
  status: string;
  source: {
    type: string;
    collaborator: string | null;
    relay: string | null;
  };
  collaborators: unknown[];
  relays: unknown[];
  current_track: {
    title: string;
    start_time: string;
    artwork_url: string | null;
    artwork_url_large: string | null;
  } | null;
  history: Array<{
    title: string;
    start_time: string;
    artwork_url: string | null;
  }>;
  logo_url: string;
  streaming_hostname: string;
  outputs: Array<{
    name: string;
    format: string;
    bitrate: number;
  }>;
}

export const RADIOCO_CONFIG = {
  stationId: 'sd0d2e77cf',
  streamUrl: 'https://streaming.radio.co/sd0d2e77cf/listen',
  statusUrl: 'https://public.radio.co/stations/sd0d2e77cf/status',
  djHost: 'sd0d2e77cf.dj.radio.co',
  djPort: 80,
};
