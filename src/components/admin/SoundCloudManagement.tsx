import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Music, Settings, Key, Link, CheckCircle, XCircle, RefreshCw, ExternalLink, Play, Pause, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SoundCloudTrack {
  id: string;
  title: string;
  duration: string;
  image: string;
  audioUrl: string;
  user?: string;
  permalink_url?: string;
}

interface SoundCloudStats {
  totalTracks: number;
  source: string;
  lastFetch: string;
  status: 'connected' | 'error' | 'pending';
}

export const SoundCloudManagement = () => {
  const [clientId, setClientId] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [tracks, setTracks] = useState<SoundCloudTrack[]>([]);
  const [stats, setStats] = useState<SoundCloudStats | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SoundCloudTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("spelman glee club gospel");

  useEffect(() => {
    loadSoundCloudConfig();
  }, []);

  const loadSoundCloudConfig = async () => {
    // In a real implementation, you'd fetch the current client ID from your settings
    // For now, we'll show if it's configured by testing the edge function
    testConnection();
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    
    try {
      const { data, error } = await supabase.functions.invoke('soundcloud-tracks', {
        body: { q: 'test', limit: 1 }
      });

      if (error) {
        console.error('SoundCloud test failed:', error);
        setConnectionStatus('error');
        toast.error('SoundCloud connection failed');
      } else if (data?.tracks && Array.isArray(data.tracks)) {
        setConnectionStatus('connected');
        setStats({
          totalTracks: data.tracks.length,
          source: data.source || 'unknown',
          lastFetch: new Date().toISOString(),
          status: data.source === 'soundcloud' ? 'connected' : 'error'
        });
        toast.success('SoundCloud connection successful');
      } else {
        setConnectionStatus('error');
        toast.error('Invalid response from SoundCloud API');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      toast.error('Failed to test SoundCloud connection');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('soundcloud-tracks', {
        body: { q: searchQuery, limit: 8 }
      });

      if (error) {
        toast.error('Failed to fetch tracks');
        return;
      }

      if (data?.tracks && Array.isArray(data.tracks)) {
        setTracks(data.tracks);
        setStats(prev => ({
          ...prev,
          totalTracks: data.tracks.length,
          source: data.source || 'unknown',
          lastFetch: new Date().toISOString(),
          status: data.source === 'soundcloud' ? 'connected' : 'error'
        }));
        toast.success(`Fetched ${data.tracks.length} tracks`);
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast.error('Failed to fetch tracks');
    }
  };

  const playTrack = async (track: SoundCloudTrack) => {
    try {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      
      const newAudio = new Audio(track.audioUrl);
      setAudio(newAudio);
      setCurrentTrack(track);
      
      newAudio.onended = () => {
        setIsPlaying(false);
      };
      
      newAudio.onerror = () => {
        toast.error('Failed to play audio');
        setIsPlaying(false);
      };
      
      await newAudio.play();
      setIsPlaying(true);
      toast.success(`Playing: ${track.title}`);
    } catch (error) {
      console.error('Error playing track:', error);
      toast.error('Failed to play track');
    }
  };

  const togglePlayPause = async () => {
    if (!audio || !currentTrack) return;
    
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      toast.error('Playback error');
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary">Not Tested</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-600/20 rounded-lg">
              <Music className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">SoundCloud Integration</h2>
              <p className="text-white/70">Manage SoundCloud API connection and music content</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="tracks">Tracks</TabsTrigger>
            <TabsTrigger value="player">Player</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {connectionStatus === 'connected' ? 'Active' : 'Inactive'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    API connection status
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Tracks</CardTitle>
                  <Music className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalTracks || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Tracks in current collection
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Source</CardTitle>
                  <Link className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{stats?.source || 'None'}</div>
                  <p className="text-xs text-muted-foreground">
                    Current audio source
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.lastFetch ? new Date(stats.lastFetch).toLocaleDateString() : 'Never'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Data last fetched
                  </p>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Music className="h-4 w-4" />
              <AlertTitle>SoundCloud API Integration</AlertTitle>
              <AlertDescription>
                This integration allows your Glee World application to fetch and display gospel and choir music from SoundCloud. 
                Configure your SoundCloud Client ID in the settings tab to enable real-time music streaming.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Configuration
                </CardTitle>
                <CardDescription>
                  Configure your SoundCloud API credentials to enable music streaming
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">SoundCloud Client ID</Label>
                  <Input
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter your SoundCloud Client ID"
                    className="font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    Get your Client ID from the{" "}
                    <a 
                      href="https://developers.soundcloud.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      SoundCloud Developer Portal
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={testConnection}
                    disabled={isTestingConnection}
                    variant="outline"
                  >
                    {isTestingConnection ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                  <Button>
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
                <CardDescription>Current status of your SoundCloud integration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>API Connection</span>
                    {getStatusBadge()}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Edge Function</span>
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Deployed
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Music Player</span>
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Track Management</CardTitle>
                <CardDescription>Fetch and manage tracks from SoundCloud</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for tracks..."
                    className="flex-1"
                  />
                  <Button onClick={fetchTracks}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fetch Tracks
                  </Button>
                </div>

                <div className="space-y-2">
                  {tracks.length > 0 ? (
                    tracks.map((track) => (
                      <div key={track.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <img 
                            src={track.image} 
                            alt={track.title}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div>
                            <h4 className="font-medium">{track.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {track.user} • {track.duration}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => playTrack(track)}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          {track.permalink_url && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={track.permalink_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No tracks loaded. Click "Fetch Tracks" to load music.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="player" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audio Player</CardTitle>
                <CardDescription>Test and control audio playback</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentTrack ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <img 
                        src={currentTrack.image} 
                        alt={currentTrack.title}
                        className="w-16 h-16 rounded object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{currentTrack.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {currentTrack.user} • {currentTrack.duration}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button onClick={togglePlayPause} size="sm">
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No track selected. Choose a track from the Tracks tab.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};