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
  private proxyBaseUrl = 'https://aqbopijztqwnrmqsyatp.functions.supabase.co/radio-proxy';

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
}

export const azuraCastService = new AzuraCastService();
export type { AzuraCastNowPlaying, AzuraCastStation, AzuraCastMount };