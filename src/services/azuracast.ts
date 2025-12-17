import { supabase } from '@/integrations/supabase/client';

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
    // Return the actual audio stream URL, not the public player page
    return this.directStreamUrl;
  }

  // Get stream URLs - try direct first, then proxy for CORS issues
  getStreamUrls(): string[] {
    return [
      this.directStreamUrl, // Direct HTTPS stream (works if CORS enabled)
      `${this.proxyBaseUrl}?url=${encodeURIComponent(this.directStreamUrl)}`, // Proxied stream for CORS bypass
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
    
    // Ensure we have a valid session before making the request
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.error('AzuraCast: No active session found');
      if (options?.returnEmptyOnError) {
        console.warn('AzuraCast: Returning empty array due to no session');
        return [];
      }
      throw new Error('Authentication required - please log in');
    }
    
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
    // NOTE: Even when `error` is set, `data` may contain our custom error body from the edge function
    if (error) {
      console.error('AzuraCast: Proxy request error:', error);
      // Extract actual error details from response body if available
      let errorMessage = error.message || 'Unknown error';
      if (data && typeof data === 'object' && data.error) {
        errorMessage = `${data.error}${data.details ? ` ${data.details}` : ''}`;
        console.error('AzuraCast: Actual error from edge function:', data);
      }
      if (options?.returnEmptyOnError) {
        console.warn('AzuraCast: Returning empty array due to error response');
        return [];
      }
      throw new Error(errorMessage);
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

  // Get songs/media from a specific playlist
  async getPlaylistMedia(playlistId: number): Promise<any[]> {
    console.log('AzuraCast: Fetching media for playlist:', playlistId);
    try {
      // Get all media files
      const allFiles = await this.makeProxyRequest(`/station/{stationId}/files/list`);
      if (!Array.isArray(allFiles)) return [];
      
      // Filter to only media files that belong to this playlist
      return allFiles.filter((file: any) => {
        if (file.type !== 'media') return false;
        const playlists = file.media?.playlists || file.playlists || [];
        return playlists.some((p: any) => {
          const pId = typeof p === 'number' ? p : p?.id;
          return pId === playlistId;
        });
      });
    } catch (error) {
      console.error('AzuraCast: Error fetching playlist media:', error);
      return [];
    }
  }

  // Request a random song from a specific playlist (on-demand feature)
  // excludeIds: Set of song IDs to skip (for retry logic when songs are on cooldown)
  async requestSongFromPlaylist(playlistId: number, excludeIds?: Set<string>): Promise<{ success: boolean; message: string; song?: any }> {
    console.log('AzuraCast: Requesting random song from playlist:', playlistId, excludeIds?.size ? `(excluding ${excludeIds.size} songs)` : '');
    
    try {
      // First, try to get requestable songs filtered by playlist
      const requestableSongs = await this.getRequestableSongs();
      
      if (Array.isArray(requestableSongs) && requestableSongs.length > 0) {
        // Filter songs that match this playlist
        let playlistSongs = requestableSongs.filter((s: any) => {
          const playlists = s.song?.playlists || [];
          return playlists.some((p: any) => {
            const pId = typeof p === 'number' ? p : p?.id;
            return pId === playlistId;
          });
        });
        
        let songsToChooseFrom = playlistSongs.length > 0 ? playlistSongs : requestableSongs;
        
        // Exclude already-tried songs
        if (excludeIds && excludeIds.size > 0) {
          songsToChooseFrom = songsToChooseFrom.filter((s: any) => {
            const songId = String(s.song?.id || s.request_id || '');
            return !excludeIds.has(songId);
          });
        }
        
        if (songsToChooseFrom.length === 0) {
          return {
            success: false,
            message: 'All available songs have been tried or are on cooldown.'
          };
        }
        
        // Pick a random song
        const randomIndex = Math.floor(Math.random() * songsToChooseFrom.length);
        const randomSong = songsToChooseFrom[randomIndex];
        
        if (randomSong?.request_id) {
          console.log('AzuraCast: Requesting song:', randomSong.song?.title);
          await this.makeProxyRequest(`/station/{stationId}/request/${randomSong.request_id}`, 'POST');
          return {
            success: true,
            message: `Requested: ${randomSong.song?.title || 'Unknown'}`,
            song: randomSong.song
          };
        }
      }
      
      // Fallback: Try to get playlist media and queue directly
      const playlistMedia = await this.getPlaylistMedia(playlistId);
      if (playlistMedia.length > 0) {
        // Filter out excluded songs
        let availableMedia = playlistMedia;
        if (excludeIds && excludeIds.size > 0) {
          availableMedia = playlistMedia.filter((f: any) => {
            const mediaId = String(f.media?.id || f.id || '');
            return !excludeIds.has(mediaId);
          });
        }
        
        if (availableMedia.length === 0) {
          return {
            success: false,
            message: 'All available songs have been tried or are on cooldown.'
          };
        }
        
        const randomIndex = Math.floor(Math.random() * availableMedia.length);
        const randomFile = availableMedia[randomIndex];
        const mediaId = randomFile.media?.id || randomFile.id;
        const title = randomFile.media?.title || randomFile.path;
        
        if (mediaId) {
          await this.requestSong(mediaId, title);
          return {
            success: true,
            message: `Queued: ${title}`,
            song: { ...randomFile.media, id: mediaId }
          };
        }
      }
      
      return {
        success: false,
        message: 'No songs available in this playlist. Enable song requests in AzuraCast.'
      };
    } catch (error: any) {
      console.error('AzuraCast: Error requesting song from playlist:', error);
      return {
        success: false,
        message: error.message || 'Failed to request song'
      };
    }
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

  // Add a song to play next using AzuraCast's Requests API.
  // NOTE: AzuraCast does NOT support POST /station/{stationId}/queue (GET/DELETE only).
  // So "queueing" in GleeWorld means "submit a request".
  async requestSong(mediaId: number, title?: string): Promise<any> {
    console.log('AzuraCast: Requesting song with media ID:', mediaId, 'title:', title);

    // 1) Get title if not provided (needed for requestable list matching)
    if (!title) {
      try {
        const mediaFile = await this.getMediaFile(mediaId);
        title = mediaFile?.title || mediaFile?.media?.title || `Media ${mediaId}`;
      } catch {
        title = `Media ${mediaId}`;
      }
    }

    // 2) Fetch requestable songs and find a matching request_id
    const requestableSongs = await this.getRequestableSongs();
    if (!Array.isArray(requestableSongs) || requestableSongs.length === 0) {
      throw new Error('No requestable songs are available on this station.');
    }

    const normalize = (t: string) =>
      (t || '')
        .toLowerCase()
        .trim()
        .replace(/\.(mp3|wav|ogg|flac|m4a|aac)$/i, '')
        .replace(/[_-]/g, ' ')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const searchTitle = normalize(title);

    const match = requestableSongs.find((s: any) => {
      const songTitle = normalize(s?.song?.title || s?.song?.text || '');
      if (!songTitle) return false;

      // exact match
      if (songTitle === searchTitle) return true;

      // contains match
      return songTitle.includes(searchTitle) || searchTitle.includes(songTitle);
    });

    if (!match?.request_id) {
      throw new Error(
        `"${title}" isn't requestable right now (not in the Requests list or blocked by station rules).`,
      );
    }

    // 3) Submit request
    try {
      const result = await this.makeProxyRequest(
        `/station/{stationId}/request/${match.request_id}`,
        'POST',
      );
      return result;
    } catch (e: any) {
      // Surface the station message (cooldowns, duplicates, etc.)
      throw new Error(e?.message || 'Request failed');
    }
  }

  // Get requestable songs list
  async getRequestableSongs(): Promise<any[]> {
    console.log('AzuraCast: Fetching requestable songs...');
    return await this.makeProxyRequest(`/station/{stationId}/requests`, 'GET', undefined, { returnEmptyOnError: true });
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

  // Get all media files from AzuraCast (recursively walks the media directory)
  async getAllMedia(): Promise<any[]> {
    console.log('AzuraCast: Fetching all media (recursive)...');

    const listPath = async (path: string) => {
      const qs = path ? `?path=${encodeURIComponent(path)}` : '';
      return await this.makeProxyRequest(`/station/{stationId}/files/list${qs}`);
    };

    try {
      const visited = new Set<string>();
      // AzuraCast tends to expect an explicit root path; try both.
      const toVisit: string[] = ['/', ''];
      const all: any[] = [];

      while (toVisit.length > 0) {
        const current = toVisit.shift() ?? '';
        if (visited.has(current)) continue;
        visited.add(current);

        const entries = await listPath(current);
        if (!Array.isArray(entries)) continue;

        for (const entry of entries) {
          const type = String(entry?.type || '').toLowerCase();
          const entryPath = entry?.path;
          const isDir = type === 'dir' || type === 'directory' || entry?.is_dir === true;

          if (isDir && typeof entryPath === 'string') {
            toVisit.push(entryPath);
            continue;
          }

          if (type === 'media' || entry?.media) {
            all.push(entry);
          }
        }
      }

      console.log('AzuraCast: Total media files found:', all.length);
      return all;
    } catch (e) {
      console.warn('AzuraCast: Recursive files/list failed, falling back to /files', e);
    }

    // Fallback to /files endpoint which may return more items (depending on AzuraCast version)
    try {
      const files = await this.makeProxyRequest(`/station/{stationId}/files`);
      if (Array.isArray(files)) {
        console.log('AzuraCast: Got', files.length, 'files from /files');
        return files;
      }
    } catch (e) {
      console.warn('AzuraCast: /files endpoint also failed');
    }

    return [];
  }

  // MEDIA MANAGEMENT  
  async addToPlaylist(playlistId: number, fileIds: number[]): Promise<void> {
    // AzuraCast playlist assignment is done per-file via:
    // PUT /station/{stationId}/file/{fileId} with playlists
    const normalizePlaylistIds = (raw: any): number[] => {
      if (!raw) return [];
      if (Array.isArray(raw)) {
        return raw
          .map((p: any) => (typeof p === 'number' ? p : p?.id))
          .filter((id: any): id is number => typeof id === 'number');
      }
      // Sometimes APIs return a keyed object map
      if (typeof raw === 'object') {
        return Object.values(raw)
          .map((p: any) => (typeof p === 'number' ? p : p?.id))
          .filter((id: any): id is number => typeof id === 'number');
      }
      return [];
    };

    const tasks = fileIds.map(async (fileId) => {
      const fileInfo = await this.makeProxyRequest(`/station/{stationId}/file/${fileId}`, 'GET');
      const currentPlaylists = normalizePlaylistIds(fileInfo?.playlists);

      const nextPlaylists = currentPlaylists.includes(playlistId)
        ? currentPlaylists
        : [...currentPlaylists, playlistId];

      await this.makeProxyRequest(`/station/{stationId}/file/${fileId}`, 'PUT', {
        playlists: nextPlaylists,
      });
    });

    const results = await Promise.allSettled(tasks);
    const failures = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    if (failures.length > 0) {
      console.error('AzuraCast: addToPlaylist failures:', failures.map((f) => f.reason));
      throw failures[0].reason;
    }
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

  // Upload a file from URL to AzuraCast media library
  // Automatically compresses large WAV files to MP3 before uploading
  async uploadMediaFromUrl(
    fileUrl: string, 
    fileName: string, 
    title?: string, 
    artist?: string,
    onProgress?: (status: string, progress?: number) => void
  ): Promise<any> {
    console.log('AzuraCast: Uploading media from URL:', fileUrl);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    onProgress?.('Uploading to radio station...');
    
    const response = await fetch('https://oopmlreysjzuxzylyheb.functions.supabase.co/azuracast-upload-media', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ fileUrl, fileName, title, artist }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMsg = errorData.error || 'Upload failed';
      throw new Error(errorMsg);
    }

    return await response.json();
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