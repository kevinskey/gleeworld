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
  private async makeProxyRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any, options?: { returnEmptyOnError?: boolean }) {
    const { supabase } = await import('@/integrations/supabase/client');
    
    console.log('AzuraCast: Making proxy request to:', endpoint);
    
    let data: any;
    let error: any;
    
    try {
      const result = await supabase.functions.invoke('azuracast-api-proxy', {
        body: {
          endpoint,
          method,
          body,
          stationId: this.stationId
        }
      });
      data = result.data;
      error = result.error;
    } catch (e: any) {
      console.error('AzuraCast: Invoke threw exception:', e);
      if (options?.returnEmptyOnError) {
        console.warn('AzuraCast: Returning empty array due to exception');
        return [];
      }
      throw e;
    }

    // Handle supabase invoke error (non-2xx status)
    if (error) {
      console.error('AzuraCast: Proxy request error:', error);
      if (options?.returnEmptyOnError) {
        console.warn('AzuraCast: Returning empty array due to error response');
        return [];
      }
      throw new Error(`Proxy request failed: ${error.message}`);
    }

    // Check if the response contains an error from the edge function/AzuraCast API
    if (data && typeof data === 'object') {
      // Check for error property (returned by our edge function on error)
      if (data.error) {
        console.error('AzuraCast: API error in response:', data);
        // Check if it's an unsupported feature error - return empty array instead of throwing
        const errorDetails = String(data.details || '');
        if (errorDetails.includes('StationUnsupportedException') || errorDetails.includes('does not currently support')) {
          console.warn('AzuraCast: Feature not supported by station, returning empty array');
          if (options?.returnEmptyOnError) {
            return [];
          }
        }
        // For other errors, check returnEmptyOnError before throwing
        if (options?.returnEmptyOnError) {
          console.warn('AzuraCast: Returning empty array due to API error');
          return [];
        }
        // Combine error and details for better error message detection
        const errorMessage = `${data.error} ${data.details || ''}`;
        throw new Error(errorMessage);
      }
      // Check if data itself indicates an error response from AzuraCast
      if (data.code && data.type && data.message) {
        console.error('AzuraCast: Direct API error:', data);
        if (options?.returnEmptyOnError) {
          console.warn('AzuraCast: Returning empty array due to direct API error');
          return [];
        }
        throw new Error(`${data.type}: ${data.message}`);
      }
    }

    console.log('AzuraCast: Proxy request successful');
    return data;
  }

  // PLAYLIST MANAGEMENT
  async getPlaylists(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/playlists`, 'GET', undefined, { returnEmptyOnError: true });
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
    return await this.makeProxyRequest(`/station/{stationId}/schedule`, 'GET', undefined, { returnEmptyOnError: true });
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
    // AzuraCast schedule endpoint doesn't support DELETE - schedule items are managed through playlists
    throw new Error('Schedule items are managed through playlist settings in AzuraCast. Delete the playlist or modify its schedule settings instead.');
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

  // QUEUE MANAGEMENT
  async getQueue(): Promise<any[]> {
    console.log('AzuraCast: Fetching queue...');
    return await this.makeProxyRequest(`/station/{stationId}/queue`, 'GET', undefined, { returnEmptyOnError: true });
  }

  async clearQueue(): Promise<void> {
    console.log('AzuraCast: Clearing queue...');
    const queue = await this.getQueue();
    for (const item of queue) {
      if (item.id) {
        await this.removeFromQueue(item.id);
      }
    }
  }

  async removeFromQueue(queueItemId: number): Promise<void> {
    console.log('AzuraCast: Removing item from queue:', queueItemId);
    await this.makeProxyRequest(`/station/{stationId}/queue/${queueItemId}`, 'DELETE');
  }

  // Request a song to be queued (uses song_id from media library)
  async requestSong(mediaId: number): Promise<any> {
    console.log('AzuraCast: Requesting song with media ID:', mediaId);
    return await this.makeProxyRequest(`/station/{stationId}/requests/${mediaId}`, 'POST');
  }

  // Get requestable songs list
  async getRequestableSongs(): Promise<any[]> {
    console.log('AzuraCast: Fetching requestable songs...');
    return await this.makeProxyRequest(`/station/{stationId}/requests`);
  }

  // Search for a song in the media library by title
  async searchMedia(query: string): Promise<any[]> {
    console.log('AzuraCast: Searching media for:', query);
    const files = await this.makeProxyRequest(`/station/{stationId}/files/list`);
    if (!Array.isArray(files)) return [];
    
    const searchLower = query.toLowerCase();
    return files.filter((file: any) => {
      if (file.type !== 'media') return false;
      const title = file.media?.title?.toLowerCase() || '';
      const artist = file.media?.artist?.toLowerCase() || '';
      const path = file.path?.toLowerCase() || '';
      return title.includes(searchLower) || artist.includes(searchLower) || path.includes(searchLower);
    });
  }

  // Get all media files from AzuraCast
  async getAllMedia(): Promise<any[]> {
    console.log('AzuraCast: Fetching all media...');
    const files = await this.makeProxyRequest(`/station/{stationId}/files/list`);
    if (!Array.isArray(files)) return [];
    return files.filter((file: any) => file.type === 'media');
  }

  // MEDIA MANAGEMENT  
  async addToPlaylist(playlistId: number, fileIds: number[]): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/playlist/${playlistId}/media`, 'POST', { media: fileIds });
  }

  async removeFromPlaylist(playlistId: number, mediaId: number): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/playlist/${playlistId}/media/${mediaId}`, 'DELETE');
  }

  // Update media file metadata (title, artist, album, etc.)
  async updateMedia(fileId: number, metadata: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
  }): Promise<any> {
    console.log('AzuraCast: Updating media metadata for file:', fileId, metadata);
    return await this.makeProxyRequest(`/station/{stationId}/file/${fileId}`, 'PUT', metadata);
  }

  // Get single media file details
  async getMediaFile(fileId: number): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/file/${fileId}`);
  }

  // Delete media file
  async deleteMedia(fileId: number): Promise<void> {
    console.log('AzuraCast: Deleting media file:', fileId);
    await this.makeProxyRequest(`/station/{stationId}/file/${fileId}`, 'DELETE');
  }

  // STREAMERS (Live DJs)
  async getStreamers(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/streamers`, 'GET', undefined, { returnEmptyOnError: true });
  }

  async createStreamer(streamerData: {
    streamer_username: string;
    streamer_password: string;
    display_name?: string;
    comments?: string;
    is_active?: boolean;
    enforce_schedule?: boolean;
  }): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/streamers`, 'POST', streamerData);
  }

  async updateStreamer(streamerId: number, streamerData: any): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/streamer/${streamerId}`, 'PUT', streamerData);
  }

  async deleteStreamer(streamerId: number): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/streamer/${streamerId}`, 'DELETE');
  }

  // MOUNT POINTS
  async getMounts(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/mounts`, 'GET', undefined, { returnEmptyOnError: true });
  }

  async createMount(mountData: {
    name: string;
    display_name?: string;
    is_visible_on_public_pages?: boolean;
    is_default?: boolean;
    relay_url?: string;
    enable_autodj?: boolean;
    autodj_format?: string;
    autodj_bitrate?: number;
  }): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/mounts`, 'POST', mountData);
  }

  async updateMount(mountId: number, mountData: any): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/mount/${mountId}`, 'PUT', mountData);
  }

  async deleteMount(mountId: number): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/mount/${mountId}`, 'DELETE');
  }

  // LISTENERS
  async getListeners(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/listeners`, 'GET', undefined, { returnEmptyOnError: true });
  }

  async disconnectListener(listenerId: number): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/listener/${listenerId}/disconnect`, 'POST');
  }

  // SONG HISTORY
  async getSongHistory(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/history`, 'GET', undefined, { returnEmptyOnError: true });
  }

  // REPORTS
  async getListenerReport(startDate?: string, endDate?: string): Promise<any> {
    let endpoint = `/station/{stationId}/reports/listeners`;
    const params = [];
    if (startDate) params.push(`start=${startDate}`);
    if (endDate) params.push(`end=${endDate}`);
    if (params.length) endpoint += `?${params.join('&')}`;
    return await this.makeProxyRequest(endpoint);
  }

  async getPerformanceReport(): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/reports/performance`);
  }

  async getSongRequestReport(): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/reports/requests`);
  }

  // WEBHOOKS
  async getWebhooks(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/webhooks`, 'GET', undefined, { returnEmptyOnError: true });
  }

  async createWebhook(webhookData: {
    name: string;
    type: string;
    webhook_url?: string;
    triggers?: string[];
    config?: any;
  }): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/webhooks`, 'POST', webhookData);
  }

  async updateWebhook(webhookId: number, webhookData: any): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/webhook/${webhookId}`, 'PUT', webhookData);
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/webhook/${webhookId}`, 'DELETE');
  }

  async testWebhook(webhookId: number): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/webhook/${webhookId}/test`, 'POST');
  }

  // SFTP USERS
  async getSftpUsers(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/sftp-users`, 'GET', undefined, { returnEmptyOnError: true });
  }

  async createSftpUser(userData: {
    username: string;
    password: string;
    public_keys?: string;
  }): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/sftp-users`, 'POST', userData);
  }

  async deleteSftpUser(userId: number): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/sftp-user/${userId}`, 'DELETE');
  }

  // HLS STREAMS
  async getHlsStreams(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/hls_streams`);
  }

  // REMOTE RELAYS
  async getRemoteRelays(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/remotes`);
  }

  async createRemoteRelay(relayData: {
    display_name: string;
    url: string;
    mount?: string;
    enable_autodj?: boolean;
    autodj_format?: string;
    autodj_bitrate?: number;
  }): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/remotes`, 'POST', relayData);
  }

  async deleteRemoteRelay(relayId: number): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/remote/${relayId}`, 'DELETE');
  }

  // PODCASTS
  async getPodcasts(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/podcasts`);
  }

  async createPodcast(podcastData: {
    title: string;
    description?: string;
    language?: string;
    categories?: string[];
  }): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/podcasts`, 'POST', podcastData);
  }

  async deletePodcast(podcastId: string): Promise<void> {
    await this.makeProxyRequest(`/station/{stationId}/podcast/${podcastId}`, 'DELETE');
  }

  async getPodcastEpisodes(podcastId: string): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/podcast/${podcastId}/episodes`);
  }

  // STATION STATUS
  async getStationStatus(): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/status`);
  }

  // FALLBACK / INTRO FILES
  async getFallbackFile(): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/fallback`);
  }

  async getIntroFile(): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/intro`);
  }

  // STEREO TOOL (if enabled)
  async getStereoToolConfig(): Promise<any> {
    return await this.makeProxyRequest(`/station/{stationId}/stereo_tool_config`);
  }

  // LOGS
  async getStationLogs(): Promise<any[]> {
    return await this.makeProxyRequest(`/station/{stationId}/logs`);
  }
}

export const azuraCastService = new AzuraCastService();
export type { AzuraCastNowPlaying, AzuraCastStation, AzuraCastMount };