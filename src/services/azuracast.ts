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
  private adminApiKey?: string;

  async getNowPlaying(): Promise<AzuraCastNowPlaying | null> {
    try {
      console.log('Fetching AzuraCast now playing data...');
      
      // Try the public API endpoint first (no auth required)
      const response = await fetch(`${this.baseUrl}/api/nowplaying/${this.stationId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`AzuraCast API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      console.log('AzuraCast now playing data:', data);
      return data;
    } catch (error) {
      console.error('Error fetching AzuraCast data:', error);
      return null;
    }
  }

  async getStationInfo(): Promise<AzuraCastStation | null> {
    try {
      console.log('Fetching AzuraCast station info...');
      
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`AzuraCast Station API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      console.log('AzuraCast station info:', data);
      return data;
    } catch (error) {
      console.error('Error fetching AzuraCast station info:', error);
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
      `${this.proxyBaseUrl}?url=${encodeURIComponent(this.directStreamUrl)}`, // Proxied HTTPS direct stream (CSP-safe)
      `${this.proxyBaseUrl}?url=${encodeURIComponent(this.getPublicStreamUrl())}`, // Proxied public page (CSP-safe)
      this.directStreamUrl, // Direct HTTPS stream (may be blocked by CSP in preview)
    ];
  }

  // Set admin API key for management operations
  setAdminApiKey(apiKey: string): void {
    // Clean the API key of any non-ASCII characters that could cause Headers errors
    this.adminApiKey = apiKey.replace(/[^\x00-\x7F]/g, "").trim();
  }

  // Get admin headers for authenticated requests
  private getAdminHeaders(): Record<string, string> {
    if (!this.adminApiKey) {
      throw new Error('Admin API key not set. Call setAdminApiKey() first.');
    }
    
    // Ensure the API key contains only valid ASCII characters for HTTP headers
    const cleanApiKey = this.adminApiKey.replace(/[^\x00-\x7F]/g, "").trim();
    
    if (!cleanApiKey) {
      throw new Error('Invalid API key format. API key must contain valid ASCII characters only.');
    }
    
    return {
      'Authorization': `Bearer ${cleanApiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  // PLAYLIST MANAGEMENT
  async getPlaylists(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/playlists`, {
        method: 'GET',
        headers: this.getAdminHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch playlists: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching playlists:', error);
      throw error;
    }
  }

  async createPlaylist(playlistData: {
    name: string;
    description?: string;
    is_enabled?: boolean;
    type?: 'default' | 'scheduled' | 'once_per_x_songs' | 'once_per_x_minutes';
    weight?: number;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/playlists`, {
        method: 'POST',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(playlistData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create playlist: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  async updatePlaylist(playlistId: number, playlistData: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/playlist/${playlistId}`, {
        method: 'PUT',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(playlistData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update playlist: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  }

  async deletePlaylist(playlistId: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/playlist/${playlistId}`, {
        method: 'DELETE',
        headers: this.getAdminHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete playlist: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  // FILE UPLOAD TO AZURACAST MEDIA LIBRARY
  async uploadFile(file: File, metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
  }): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          if (value) formData.append(key, value);
        });
      }

      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.adminApiKey}`,
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async getFiles(path: string = ''): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/files?path=${encodeURIComponent(path)}`, {
        method: 'GET',
        headers: this.getAdminHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/file`, {
        method: 'DELETE',
        headers: this.getAdminHeaders(),
        body: JSON.stringify({ path: filePath }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // SCHEDULE CONTROL
  async getSchedule(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/schedule`, {
        method: 'GET',
        headers: this.getAdminHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schedule: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching schedule:', error);
      throw error;
    }
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
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/schedule`, {
        method: 'POST',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create schedule entry: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating schedule entry:', error);
      throw error;
    }
  }

  async updateScheduleEntry(scheduleId: number, scheduleData: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/schedule/${scheduleId}`, {
        method: 'PUT',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update schedule entry: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating schedule entry:', error);
      throw error;
    }
  }

  async deleteScheduleEntry(scheduleId: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/schedule/${scheduleId}`, {
        method: 'DELETE',
        headers: this.getAdminHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete schedule entry: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting schedule entry:', error);
      throw error;
    }
  }

  // STATION CONFIGURATION
  async getStationConfig(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}`, {
        method: 'GET',
        headers: this.getAdminHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch station config: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching station config:', error);
      throw error;
    }
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
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}`, {
        method: 'PUT',
        headers: this.getAdminHeaders(),
        body: JSON.stringify(configData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update station config: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating station config:', error);
      throw error;
    }
  }

  async restartStation(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/restart`, {
        method: 'POST',
        headers: this.getAdminHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to restart station: ${response.status}`);
      }
    } catch (error) {
      console.error('Error restarting station:', error);
      throw error;
    }
  }

  // MEDIA MANAGEMENT
  async addToPlaylist(playlistId: number, fileIds: number[]): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/playlist/${playlistId}/media`, {
        method: 'POST',
        headers: this.getAdminHeaders(),
        body: JSON.stringify({ media: fileIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add media to playlist: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding media to playlist:', error);
      throw error;
    }
  }

  async removeFromPlaylist(playlistId: number, mediaId: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/station/${this.stationId}/playlist/${playlistId}/media/${mediaId}`, {
        method: 'DELETE',
        headers: this.getAdminHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to remove media from playlist: ${response.status}`);
      }
    } catch (error) {
      console.error('Error removing media from playlist:', error);
      throw error;
    }
  }
}

export const azuraCastService = new AzuraCastService();
export type { AzuraCastNowPlaying, AzuraCastStation, AzuraCastMount };