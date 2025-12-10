import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { supabase } from '@/integrations/supabase/client';
import { azuraCastService } from '@/services/azuracast';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Square,
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  Headphones,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle2,
  Disc3,
  Waves,
  Podcast,
  MessageSquare,
  Music,
  RefreshCw,
  Settings,
  Signal,
  Wifi,
  WifiOff,
  Loader2,
  Power,
  PowerOff,
  RotateCcw
} from 'lucide-react';

interface UpNextTrack {
  title: string;
  artist: string;
  album?: string;
  art?: string;
  duration?: number;
}

interface DJTransportControlProps {
  stationState: {
    isOnline: boolean;
    isLive: boolean;
    streamerName: string | null;
    currentlyPlaying: string | null;
    currentArtist: string | null;
    listenerCount: number;
  };
  onRefresh: () => void;
}

interface LiveInsertion {
  id: string;
  type: 'announcement' | 'jingle' | 'promo' | 'emergency';
  title: string;
  audioUrl?: string;
  text?: string;
  duration?: number;
}

export const DJTransportControl = ({ stationState, onRefresh }: DJTransportControlProps) => {
  // Use the shared radio player hook - same as header
  const { 
    isPlaying, 
    isLoading, 
    togglePlayPause, 
    setVolume, 
    volume 
  } = useRadioPlayer();

  const [isConnected, setIsConnected] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [djName, setDjName] = useState('');
  const [masterVolume, setMasterVolume] = useState([volume * 100]);
  const [micVolume, setMicVolume] = useState([70]);
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [crossfadeValue, setCrossfadeValue] = useState([50]);
  const [insertionQueue, setInsertionQueue] = useState<LiveInsertion[]>([]);
  const [selectedInsertion, setSelectedInsertion] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [showSettings, setShowSettings] = useState(false);
  const [streamKey, setStreamKey] = useState('');
  const [activeTab, setActiveTab] = useState('transport');
  const [serverControlLoading, setServerControlLoading] = useState<'start' | 'stop' | 'skip' | 'restart' | null>(null);
  const [upNext, setUpNext] = useState<UpNextTrack | null>(null);
  const [loadingUpNext, setLoadingUpNext] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Fetch up next track
  const fetchUpNext = async () => {
    try {
      setLoadingUpNext(true);
      const nowPlaying = await azuraCastService.getNowPlaying();
      if (nowPlaying?.playing_next?.song) {
        setUpNext({
          title: nowPlaying.playing_next.song.title || 'Unknown Track',
          artist: nowPlaying.playing_next.song.artist || 'Unknown Artist',
          album: nowPlaying.playing_next.song.album,
          art: nowPlaying.playing_next.song.art,
          duration: nowPlaying.playing_next.duration,
        });
      } else {
        setUpNext(null);
      }
    } catch (error) {
      console.error('Error fetching up next:', error);
    } finally {
      setLoadingUpNext(false);
    }
  };

  // Fetch up next on mount and when refresh is called
  useEffect(() => {
    fetchUpNext();
  }, [stationState.currentlyPlaying]);

  // Sync master volume slider with radio player volume
  useEffect(() => {
    setMasterVolume([volume * 100]);
  }, [volume]);

  // Handle master volume change
  const handleMasterVolumeChange = (value: number[]) => {
    setMasterVolume(value);
    setVolume(value[0] / 100);
  };

  // Pre-defined live insertions
  const presetInsertions: LiveInsertion[] = [
    { id: 'station-id', type: 'jingle', title: 'Station ID', duration: 10 },
    { id: 'break-bumper', type: 'jingle', title: 'Break Bumper', duration: 5 },
    { id: 'emergency', type: 'emergency', title: 'Emergency Alert', duration: 30 },
    { id: 'promo-1', type: 'promo', title: 'Event Promo', duration: 15 },
    { id: 'announcement', type: 'announcement', title: 'Live Announcement', duration: 0 },
  ];

  useEffect(() => {
    // Sync with station state
    setIsLiveMode(stationState.isLive);
    if (stationState.streamerName) {
      setDjName(stationState.streamerName);
    }
    setIsConnected(stationState.isOnline);
    setConnectionStatus(stationState.isOnline ? 'connected' : 'disconnected');
  }, [stationState]);

  const handleConnect = async () => {
    try {
      setConnectionStatus('connecting');
      toast({ title: "Connecting...", description: "Establishing connection to broadcast server" });
      
      // Test connection via AzuraCast
      const stationConfig = await azuraCastService.getStationConfig();
      
      if (stationConfig) {
        setIsConnected(true);
        setConnectionStatus('connected');
        toast({ title: "Connected", description: "Successfully connected to Glee World Radio" });
      }
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      toast({ title: "Connection Failed", description: "Could not connect to broadcast server", variant: "destructive" });
    }
  };

  const handleGoLive = async () => {
    if (!djName.trim()) {
      toast({ title: "DJ Name Required", description: "Please enter your DJ name before going live", variant: "destructive" });
      return;
    }

    try {
      setIsLiveMode(true);
      
      // Update station state in database
      await supabase.from('gw_radio_station_state').update({
        is_live: true,
        streamer_name: djName,
        last_event_type: 'live_streamer_connected',
        last_updated: new Date().toISOString()
      }).eq('station_id', 'glee_world_radio');

      toast({ 
        title: "You're Live!", 
        description: `Broadcasting as ${djName}`,
      });
      
      onRefresh();
    } catch (error) {
      console.error('Go live error:', error);
      toast({ title: "Error", description: "Failed to go live", variant: "destructive" });
      setIsLiveMode(false);
    }
  };

  const handleEndLive = async () => {
    try {
      setIsLiveMode(false);
      setIsMicMuted(true);
      
      // Stop media stream if active
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // Update station state
      await supabase.from('gw_radio_station_state').update({
        is_live: false,
        streamer_name: null,
        last_event_type: 'live_streamer_disconnected',
        last_updated: new Date().toISOString()
      }).eq('station_id', 'glee_world_radio');

      toast({ title: "Broadcast Ended", description: "You are no longer live" });
      onRefresh();
    } catch (error) {
      console.error('End live error:', error);
      toast({ title: "Error", description: "Failed to end broadcast", variant: "destructive" });
    }
  };

  const handleMicToggle = async () => {
    if (isMicMuted) {
      // Request microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setIsMicMuted(false);
        toast({ title: "Microphone Active", description: "Your mic is now live" });
      } catch (error) {
        console.error('Mic access error:', error);
        toast({ title: "Microphone Error", description: "Could not access microphone", variant: "destructive" });
      }
    } else {
      // Mute microphone
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(track => track.enabled = false);
      }
      setIsMicMuted(true);
      toast({ title: "Microphone Muted", description: "Your mic is now muted" });
    }
  };

  // Use the shared togglePlayPause from useRadioPlayer hook
  const handlePlayPause = () => {
    togglePlayPause();
  };

  // Server-side skip track (affects all listeners)
  const handleSkipTrack = async () => {
    try {
      setServerControlLoading('skip');
      toast({ title: "Skipping...", description: "Moving to next track on server" });
      await azuraCastService.skipTrack();
      onRefresh();
      toast({ title: "Skipped", description: "Track skipped on server" });
    } catch (error) {
      console.error('Skip track error:', error);
      toast({ title: "Error", description: "Failed to skip track", variant: "destructive" });
    } finally {
      setServerControlLoading(null);
    }
  };

  // Server-side station start (affects all listeners)
  const handleStartStation = async () => {
    try {
      setServerControlLoading('start');
      toast({ title: "Starting Station...", description: "Starting AutoDJ and stream" });
      await azuraCastService.startBackend();
      await azuraCastService.startFrontend();
      onRefresh();
      toast({ title: "Station Started", description: "Radio is now broadcasting to all listeners" });
    } catch (error) {
      console.error('Start station error:', error);
      toast({ title: "Error", description: "Failed to start station", variant: "destructive" });
    } finally {
      setServerControlLoading(null);
    }
  };

  // Server-side station stop (affects all listeners)
  const handleStopStation = async () => {
    try {
      setServerControlLoading('stop');
      toast({ title: "Stopping Station...", description: "Stopping broadcast for all listeners" });
      await azuraCastService.stopBackend();
      await azuraCastService.stopFrontend();
      onRefresh();
      toast({ title: "Station Stopped", description: "Radio broadcast has been stopped" });
    } catch (error) {
      console.error('Stop station error:', error);
      toast({ title: "Error", description: "Failed to stop station", variant: "destructive" });
    } finally {
      setServerControlLoading(null);
    }
  };

  // Server-side station restart
  const handleRestartStation = async () => {
    try {
      setServerControlLoading('restart');
      toast({ title: "Restarting Station...", description: "Restarting AutoDJ and stream" });
      await azuraCastService.restartBackend();
      await azuraCastService.restartFrontend();
      onRefresh();
      toast({ title: "Station Restarted", description: "Radio has been restarted" });
    } catch (error) {
      console.error('Restart station error:', error);
      toast({ title: "Error", description: "Failed to restart station", variant: "destructive" });
    } finally {
      setServerControlLoading(null);
    }
  };

  const handleLiveInsertion = async (insertion: LiveInsertion) => {
    try {
      toast({ 
        title: `Inserting: ${insertion.title}`, 
        description: insertion.type === 'announcement' ? 'Speak now...' : `Playing ${insertion.type}`
      });

      // Add to insertion queue
      setInsertionQueue(prev => [...prev, { ...insertion, id: `${insertion.id}-${Date.now()}` }]);

      // Log the insertion
      console.log('Live insertion triggered:', insertion);

      // If it's an announcement, activate mic
      if (insertion.type === 'announcement' && isMicMuted) {
        await handleMicToggle();
      }
    } catch (error) {
      toast({ title: "Insertion Failed", description: "Could not play insertion", variant: "destructive" });
    }
  };

  const removeFromQueue = (id: string) => {
    setInsertionQueue(prev => prev.filter(item => item.id !== id));
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-emerald-400';
      case 'connecting': return 'text-amber-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="h-4 w-4" />;
      case 'connecting': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'error': return <WifiOff className="h-4 w-4" />;
      default: return <WifiOff className="h-4 w-4" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 overflow-hidden">
      {/* Header with live indicator */}
      <CardHeader className="py-3 px-4 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isLiveMode ? "bg-red-500/20" : "bg-primary/20"
            )}>
              {isLiveMode ? (
                <Podcast className="h-5 w-5 text-red-400" />
              ) : (
                <Radio className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                DJ Transport Control
                {isLiveMode && (
                  <Badge className="bg-red-500 text-white animate-pulse">
                    ON AIR
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {isLiveMode ? `Broadcasting as ${djName}` : 'Real-time broadcast control'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs", getConnectionStatusColor())}>
              {getConnectionStatusIcon()}
              <span className="capitalize">{connectionStatus}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSettings(!showSettings)}
              className="text-slate-400 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 bg-slate-800/50 p-1">
            <TabsTrigger value="transport" className="text-xs data-[state=active]:bg-primary">
              <Play className="h-3 w-3 mr-1" />
              Transport
            </TabsTrigger>
            <TabsTrigger value="live" className="text-xs data-[state=active]:bg-red-500">
              <Mic className="h-3 w-3 mr-1" />
              Go Live
            </TabsTrigger>
            <TabsTrigger value="insertions" className="text-xs data-[state=active]:bg-amber-500">
              <Zap className="h-3 w-3 mr-1" />
              Insertions
            </TabsTrigger>
            <TabsTrigger value="mixer" className="text-xs data-[state=active]:bg-purple-500">
              <Waves className="h-3 w-3 mr-1" />
              Mixer
            </TabsTrigger>
          </TabsList>

          {/* Transport Controls */}
          <TabsContent value="transport" className="mt-4 space-y-4">
            {/* Main Transport Buttons */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="lg"
                className="h-14 w-14 rounded-full border-slate-600 bg-slate-800 hover:bg-slate-700"
                onClick={() => {}}
              >
                <SkipBack className="h-5 w-5 text-slate-300" />
              </Button>
              
              <Button
                size="lg"
                className={cn(
                  "h-20 w-20 rounded-full transition-all",
                  isLoading
                    ? "bg-slate-500"
                    : isPlaying 
                      ? "bg-amber-500 hover:bg-amber-600" 
                      : "bg-emerald-500 hover:bg-emerald-600"
                )}
                onClick={handlePlayPause}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-8 w-8 text-white" />
                ) : (
                  <Play className="h-8 w-8 text-white ml-1" />
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-14 w-14 rounded-full border-slate-600 bg-slate-800 hover:bg-slate-700"
                onClick={handleSkipTrack}
              >
                <SkipForward className="h-5 w-5 text-slate-300" />
              </Button>
            </div>

            {/* Now Playing Display */}
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <Disc3 className={cn("h-6 w-6 text-primary", isPlaying && "animate-spin")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {stationState.currentlyPlaying || 'No track playing'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {stationState.currentArtist || 'Unknown artist'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Listeners</p>
                  <p className="text-lg font-bold text-emerald-400">{stationState.listenerCount}</p>
                </div>
              </div>
            </div>

            {/* Up Next Display */}
            <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <SkipForward className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Up Next</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 ml-auto text-slate-400 hover:text-white"
                  onClick={fetchUpNext}
                  disabled={loadingUpNext}
                >
                  <RefreshCw className={cn("h-3 w-3", loadingUpNext && "animate-spin")} />
                </Button>
              </div>
              {loadingUpNext ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-700 rounded animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-slate-700 rounded w-3/4 animate-pulse" />
                    <div className="h-2 bg-slate-700 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ) : upNext ? (
                <div className="flex items-center gap-3">
                  {upNext.art ? (
                    <img 
                      src={upNext.art} 
                      alt={upNext.title}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-slate-700 rounded flex items-center justify-center">
                      <Music className="h-4 w-4 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {upNext.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {upNext.artist}
                    </p>
                  </div>
                  {upNext.duration && (
                    <div className="text-xs text-slate-500">
                      {Math.floor(upNext.duration / 60)}:{String(upNext.duration % 60).padStart(2, '0')}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No track queued</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={onRefresh}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={handleConnect}
              >
                <Signal className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Headphones className="h-3 w-3 mr-1" />
                Preview
              </Button>
            </div>

            {/* Server Station Control - Affects ALL Listeners */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Server Control (Affects All Listeners)</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleStartStation}
                  disabled={serverControlLoading !== null || stationState.isOnline}
                >
                  {serverControlLoading === 'start' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Power className="h-3 w-3 mr-1" />
                      Start
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleStopStation}
                  disabled={serverControlLoading !== null || !stationState.isOnline}
                >
                  {serverControlLoading === 'stop' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <PowerOff className="h-3 w-3 mr-1" />
                      Stop
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  onClick={handleRestartStation}
                  disabled={serverControlLoading !== null}
                >
                  {serverControlLoading === 'restart' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restart
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  onClick={handleSkipTrack}
                  disabled={serverControlLoading !== null || !stationState.isOnline}
                >
                  {serverControlLoading === 'skip' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <SkipForward className="h-3 w-3 mr-1" />
                      Skip
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-slate-400">
                These controls affect the actual radio broadcast. Start/Stop will turn the station on/off for everyone.
              </p>
            </div>
          </TabsContent>

          {/* Go Live Tab */}
          <TabsContent value="live" className="mt-4 space-y-4">
            {!isLiveMode ? (
              <>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="dj-name" className="text-slate-300 text-xs">DJ Name / Show Name</Label>
                    <Input
                      id="dj-name"
                      value={djName}
                      onChange={(e) => setDjName(e.target.value)}
                      placeholder="Enter your DJ name..."
                      className="mt-1 bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGoLive}
                  className="w-full h-16 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-lg"
                  disabled={!isConnected || !djName.trim()}
                >
                  <Podcast className="h-6 w-6 mr-2" />
                  GO LIVE
                </Button>

                <p className="text-xs text-slate-400 text-center">
                  {!isConnected ? 'Connect to the server first' : 'Enter your name and click to start broadcasting'}
                </p>
              </>
            ) : (
              <>
                {/* Live Controls */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-400 font-bold">LIVE</span>
                    </div>
                    <span className="text-slate-400 text-sm">Broadcasting as {djName}</span>
                  </div>

                  {/* Microphone Control */}
                  <div className="flex items-center justify-center">
                    <Button
                      onClick={handleMicToggle}
                      className={cn(
                        "h-24 w-24 rounded-full transition-all",
                        isMicMuted 
                          ? "bg-slate-700 hover:bg-slate-600" 
                          : "bg-red-500 hover:bg-red-600 animate-pulse"
                      )}
                    >
                      {isMicMuted ? (
                        <MicOff className="h-10 w-10 text-slate-400" />
                      ) : (
                        <Mic className="h-10 w-10 text-white" />
                      )}
                    </Button>
                  </div>
                  <p className="text-center text-xs text-slate-400">
                    {isMicMuted ? 'Click to unmute microphone' : 'Microphone is LIVE'}
                  </p>
                </div>

                <Button
                  onClick={handleEndLive}
                  variant="outline"
                  className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <Square className="h-4 w-4 mr-2" />
                  End Broadcast
                </Button>
              </>
            )}
          </TabsContent>

          {/* Live Insertions Tab */}
          <TabsContent value="insertions" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {presetInsertions.map((insertion) => (
                <Button
                  key={insertion.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleLiveInsertion(insertion)}
                  className={cn(
                    "h-16 flex-col gap-1 border-slate-600",
                    insertion.type === 'emergency' && "border-red-500/50 text-red-400 hover:bg-red-500/10",
                    insertion.type === 'jingle' && "border-purple-500/50 text-purple-400 hover:bg-purple-500/10",
                    insertion.type === 'promo' && "border-amber-500/50 text-amber-400 hover:bg-amber-500/10",
                    insertion.type === 'announcement' && "border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  )}
                >
                  {insertion.type === 'emergency' && <AlertCircle className="h-4 w-4" />}
                  {insertion.type === 'jingle' && <Music className="h-4 w-4" />}
                  {insertion.type === 'promo' && <Zap className="h-4 w-4" />}
                  {insertion.type === 'announcement' && <MessageSquare className="h-4 w-4" />}
                  <span className="text-xs">{insertion.title}</span>
                </Button>
              ))}
            </div>

            {/* Insertion Queue */}
            {insertionQueue.length > 0 && (
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">Queue</Label>
                <div className="space-y-1">
                  {insertionQueue.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between bg-slate-800/50 rounded px-2 py-1.5 text-xs"
                    >
                      <span className="text-slate-300">{item.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromQueue(item.id)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Insertion */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs">Quick Text Announcement</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Type announcement..."
                  className="bg-slate-800 border-slate-600 text-white text-sm"
                />
                <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                  <Mic className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Mixer Tab */}
          <TabsContent value="mixer" className="mt-4 space-y-4">
            {/* Master Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-xs flex items-center gap-2">
                  <Volume2 className="h-3 w-3" />
                  Master Volume
                </Label>
                <span className="text-xs text-slate-400">{masterVolume[0]}%</span>
              </div>
              <Slider
                value={masterVolume}
                onValueChange={handleMasterVolumeChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Mic Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-xs flex items-center gap-2">
                  <Mic className="h-3 w-3" />
                  Microphone
                </Label>
                <span className="text-xs text-slate-400">{micVolume[0]}%</span>
              </div>
              <Slider
                value={micVolume}
                onValueChange={setMicVolume}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Crossfade */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-xs">Crossfade</Label>
                <span className="text-xs text-slate-400">{crossfadeValue[0]}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">A</span>
                <Slider
                  value={crossfadeValue}
                  onValueChange={setCrossfadeValue}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-[10px] text-slate-500">B</span>
              </div>
            </div>

            {/* Audio Meters (visual only) */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs">Audio Levels</Label>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-6">L</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500"
                      style={{ width: `${Math.random() * 30 + 50}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-6">R</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500"
                      style={{ width: `${Math.random() * 30 + 45}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
