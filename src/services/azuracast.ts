interface AzuraCastStation {
  id: number;
  name: string;
  shortcode: string;
  description: string;
  frontend: string;
  backend: string;
  listen_url: string;
  is_public: boolean;
  mounts: AzuraCastMount[];
  remotes: any[];
}

interface AzuraCastMount {
  id: number;
  name: string;
  url: string;
  bitrate: number;
  format: string;
  listeners: {
    current: number;
    unique: number;
    total: number;
  };
}

interface AzuraCastNowPlaying {
  station: AzuraCastStation;
  listeners: {
    current: number;
    unique: number;
    total: number;
  };
  live: {
    is_live: boolean;
    streamer_name?: string;
  };
  now_playing: {
    duration: number;
    playlist: string;
    streamer: string;
    elapsed: number;
    remaining: number;
    sh_id: number;
    song: {
      id: string;
      text: string;
      artist: string;
      title: string;
      album: string;
      genre: string;
      lyrics: string;
      art: string;
      custom_fields: any[];
    };
  };
  playing_next: {
    duration: number;
    playlist: string;
    streamer: string;
    sh_id: number;
    song: {
      id: string;
      text: string;
      artist: string;
      title: string;
      album: string;
      genre: string;
      lyrics: string;
      art: string;
      custom_fields: any[];
    };
  };
  song_history: Array<{
    duration: number;
    playlist: string;
    streamer: string;
    played_at: number;
    sh_id: number;
    song: {
      id: string;
      text: string;
      artist: string;
      title: string;
      album: string;
      genre: string;
      lyrics: string;
      art: string;
      custom_fields: any[];
    };
  }>;
  cache: string;
}

class AzuraCastService {
  private baseUrl = 'https://radio.gleeworld.org';
  private stationId = 'glee_world_radio';
  private directStreamUrl = 'https://radio.gleeworld.org/listen/glee_world_radio/radio.mp3'; // Use HTTPS
  private proxyBaseUrl = 'https://oopmlreysjzuxzylyheb.functions.supabase.co/radio-proxy';
  private apiProxyUrl = 'https://oopmlreysjzuxzylyheb.functions.supabase.co/azuracast-api-proxy';
  private adminApiKey?: string;

  async getNowPlaying(): Promise<AzuraCastNowPlaying | null> {
    try {
      console.log('AzuraCast: Fetching now playing data via proxy...');
      
      // Use our proxy for API calls to handle CORS and authentication
      const data = await this.makeProxyRequest(`/nowplaying/${this.stationId}`);
      console.log('AzuraCast now playing data:', data);
      return data;
    } catch (error) {
      console.error('Error fetching AzuraCast data via proxy:', error);
      return null;
    }
  }

  async getStationInfo(): Promise<AzuraCastStation | null> {
    try {
      console.log('AzuraCast: Fetching station info via proxy...');
      
      // Use our proxy for API calls to handle CORS and authentication  
      const data = await this.makeProxyRequest(`/station/${this.stationId}`);
      console.log('AzuraCast station info:', data);
      return data;
    } catch (error) {
      console.error('Error fetching AzuraCast station info via proxy:', error);
      return null;
    }
  }

  getStreamUrl(): string {
    return this.directStreamUrl;
  }

  getPublicStreamUrl(): string {
    return `${this.baseUrl}/public/${this.stationId}`;
  }

  // Get stream URLs - use Supabase proxy first to satisfy CSP, then direct
  getStreamUrls(): string[] {
    return [
      this.directStreamUrl, // Prefer direct HTTPS stream for long-lived connections
      this.getPublicStreamUrl(), // AzuraCast public player URL as fallback
      `${this.proxyBaseUrl}?url=${encodeURIComponent(this.directStreamUrl)}`, // Proxied direct stream (last resort)
      `${this.proxyBaseUrl}?url=${encodeURIComponent(this.getPublicStreamUrl())}`, // Proxied public page (last resort)
    ];
  }

  // Set admin API key for management operations
  setAdminApiKey(apiKey: string): void {
    // Clean the API key of any non-ASCII characters that could cause Headers errors
    this.adminApiKey = apiKey.replace(/[^\x00-\x7F]/g, "").trim();
  }

  // Make authenticated request via proxy
  private async makeProxyRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any) {
    const { supabase } = await import('@/integrations/supabase/client');
    
    console.log('AzuraCast: Making proxy request to:', endpoint);
    
    const { data, error } = await supabase.functions.invoke('azuracast-api-proxy', {
      body: {
        endpoint,
        method,
        body,
        stationId: this.stationId
      }
    });

    if (error) {
      console.error('AzuraCast: Proxy request error:', error);
      throw new Error(`Proxy request failed: ${error.message}`);
    }

    console.log('AzuraCast: Proxy request successful');
    return data;
  }

  // PLAYLIST MANAGEMENT
  async getPlaylists(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/playlists`);
  }

  async createPlaylist(playlistData: {
    name: string;
    description?: string;
    is_enabled?: boolean;
    type?: 'default' | 'scheduled' | 'once_per_x_songs' | 'once_per_x_minutes';
    weight?: number;
  }): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/playlists`, 'POST', playlistData);
  }

  async updatePlaylist(playlistId: number, playlistData: any): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/playlist/${playlistId}`, 'PUT', playlistData);
  }

  async deletePlaylist(playlistId: number): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/playlist/${playlistId}`, 'DELETE');
  }

  // FILE UPLOAD TO AZURACAST MEDIA LIBRARY
  async uploadFile(file: File, metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
  }): Promise<any> {
    // Note: File upload will need special handling via proxy
    throw new Error('File upload not yet implemented via proxy');
  }

  async getFiles(path: string = ''): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/files?path=${encodeURIComponent(path)}`);
  }

  async getMediaCount(): Promise<number> {
    try {
      // Get all files from AzuraCast media library
      const files = await this.makeProxyRequest(`/station/{stationId}/files/list`);
      if (Array.isArray(files)) {
        return files.length;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching AzuraCast media count:', error);
      return 0;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/file`, 'DELETE', { path: filePath });
  }

  // SCHEDULE CONTROL
  async getSchedule(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/schedule`);
  }

  async createScheduleEntry(scheduleData: {
    name: string;
    playlist_id?: number;
    streamer_id?: number;
    start_time: string; // HH:MM format
    end_time: string;   // HH:MM format
    start_date?: string; // YYYY-MM-DD format
    end_date?: string;   // YYYY-MM-DD format
    days?: number[];     // Array of day numbers (0=Sunday, 1=Monday, etc.)
  }): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/schedule`, 'POST', scheduleData);
  }

  async updateScheduleEntry(scheduleId: number, scheduleData: any): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/schedule/${scheduleId}`, 'PUT', scheduleData);
  }

  async deleteScheduleEntry(scheduleId: number): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/schedule/${scheduleId}`, 'DELETE');
  }

  // STATION CONFIGURATION
  async getStationConfig(): Promise<any> {
    console.log('AzuraCast: Getting station config via proxy...');
    return await this.makeProxyRequest(`/station/{stationId}`);
  }

  async updateStationConfig(configData: {
    name?: string;
    description?: string;
    genre?: string;
    url?: string;
    timezone?: string;
    enable_public_page?: boolean;
    enable_on_demand?: boolean;
    default_album_art_url?: string;
  }): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}`, 'PUT', configData);
  }

  async restartStation(): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/restart`, 'POST');
  }

  // STATION POWER CONTROL (affects all listeners)
  async startBackend(): Promise<void> {
    console.log('AzuraCast: Starting station backend (AutoDJ)...');
    await this.makeProxyRequest(`/station/{stationId}/backend/start`, 'POST');
  }

  async stopBackend(): Promise<void> {
    console.log('AzuraCast: Stopping station backend (AutoDJ)...');
    await this.makeProxyRequest(`/station/{stationId}/backend/stop`, 'POST');
  }

  async restartBackend(): Promise<void> {
    console.log('AzuraCast: Restarting station backend (AutoDJ)...');
    await this.makeProxyRequest(`/station/{stationId}/backend/restart`, 'POST');
  }

  async startFrontend(): Promise<void> {
    console.log('AzuraCast: Starting station frontend (stream)...');
    await this.makeProxyRequest(`/station/{stationId}/frontend/start`, 'POST');
  }

  async stopFrontend(): Promise<void> {
    console.log('AzuraCast: Stopping station frontend (stream)...');
    await this.makeProxyRequest(`/station/{stationId}/frontend/stop`, 'POST');
  }

  async restartFrontend(): Promise<void> {
    console.log('AzuraCast: Restarting station frontend (stream)...');
    await this.makeProxyRequest(`/station/{stationId}/frontend/restart`, 'POST');
  }

  // Skip to next track in queue
  async skipTrack(): Promise<void> {
    console.log('AzuraCast: Skipping current track...');
    await this.makeProxyRequest(`/station/{stationId}/backend/skip`, 'POST');
  }

  // MEDIA MANAGEMENT  
  async addToPlaylist(playlistId: number, fileIds: number[]): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/playlist/${playlistId}/media`, 'POST', { media: fileIds });
  }

  async removeFromPlaylist(playlistId: number, mediaId: number): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/playlist/${playlistId}/media/${mediaId}`, 'DELETE');
  }
}

export const azuraCastService = new AzuraCastService();
export type { AzuraCastNowPlaying, AzuraCastStation, AzuraCastMount };