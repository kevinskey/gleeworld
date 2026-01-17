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
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  Headphones,
  Clock,
  AlertCircle,
  CheckCircle2,
  Waves,
  MessageSquare,
  Music,
  RefreshCw,
  Settings,
  Signal,
  Wifi,
  WifiOff,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface DJTransportControlProps {
  stationState: {
    isOnline: boolean;
    isLive: boolean;
    streamerName: string | null;
    currentlyPlaying: string | null;
    currentArtist: string | null;
    listenerCount: number;
  };
  stationId: string;
  stationName?: string;
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

export const DJTransportControl = ({ stationState, stationId, stationName, onRefresh }: DJTransportControlProps) => {
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
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [activeTab, setActiveTab] = useState('transport');
  const [announcementText, setAnnouncementText] = useState('');
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('9wYX8b0wRvLUEYtGuzP5');
  const [eventPromoText, setEventPromoText] = useState("Don't miss our upcoming performances! Visit GleeWorld.org for tickets and event information. Glee World Radio, where music meets legacy.");

  const voiceOptions = [
    { id: '9wYX8b0wRvLUEYtGuzP5', name: 'KeKe', description: 'Black woman, sassy' },
    { id: 'CVRACyqNcQefTlxMj9bt', name: 'Lamar Lincoln', description: 'Black male, young raspy' },
    { id: 'OOk3INdXVLRmSaQoAX9D', name: 'Alicia Speaks', description: 'Black woman, calm' },
    { id: '7sXif1ZLnLgbMgmFvs2G', name: 'Denzel', description: 'Black male, deep' },
    { id: '1Y79BeuotytFuNrig6K0', name: 'Kevin J', description: 'Black male' },
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Young female' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft female' },
    { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Warm female' },
    { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Warm male' },
    { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Deep male' },
    { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', description: 'Friendly male' },
  ];

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const announcementAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadEventPromo = async () => {
      try {
        const { data } = await supabase
          .from('dashboard_settings')
          .select('setting_value')
          .eq('setting_name', 'event_promo_text')
          .single();
        
        if (data?.setting_value) {
          setEventPromoText(data.setting_value);
        }
      } catch (error) {
        console.log('Using default event promo text');
      }
    };
    loadEventPromo();
  }, []);

  useEffect(() => {
    setMasterVolume([volume * 100]);
  }, [volume]);

  const handleMasterVolumeChange = (value: number[]) => {
    setMasterVolume(value);
    setVolume(value[0] / 100);
  };

  const presetInsertions: LiveInsertion[] = [
    { id: 'station-id', type: 'jingle', title: 'Station ID', duration: 10 },
    { id: 'break-bumper', type: 'jingle', title: 'Break Bumper', duration: 5 },
    { id: 'emergency', type: 'emergency', title: 'Emergency Alert', duration: 30 },
    { id: 'promo-1', type: 'promo', title: 'Event Promo', duration: 15 },
    { id: 'announcement', type: 'announcement', title: 'Live Announcement', duration: 0 },
  ];

  useEffect(() => {
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
      
      // For Radio.co, connection is managed externally
      setIsConnected(true);
      setConnectionStatus('connected');
      toast({ title: "Connected", description: "Successfully connected to Glee World Radio" });
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
      
      await supabase.from('gw_radio_station_state').update({
        is_live: true,
        streamer_name: djName,
        last_event_type: 'live_streamer_connected',
        last_updated: new Date().toISOString()
      }).eq('station_id', stationId);

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
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      await supabase.from('gw_radio_station_state').update({
        is_live: false,
        streamer_name: null,
        last_event_type: 'live_streamer_disconnected',
        last_updated: new Date().toISOString()
      }).eq('station_id', stationId);

      toast({ title: "Broadcast Ended", description: "You are no longer live" });
      onRefresh();
    } catch (error) {
      console.error('End live error:', error);
      toast({ title: "Error", description: "Failed to end broadcast", variant: "destructive" });
    }
  };

  const handleMicToggle = async () => {
    if (isMicMuted) {
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
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(track => track.enabled = false);
      }
      setIsMicMuted(true);
      toast({ title: "Microphone Muted", description: "Your mic is now muted" });
    }
  };

  const handlePlayPause = () => {
    togglePlayPause();
  };

  const handleManageInRadioCo = () => {
    window.open('https://studio.radio.co/', '_blank');
  };

  const insertionScripts: Record<string, string> = {
    'station-id': "You're listening to Glee World Radio, the official voice of the Spelman College Glee Club. To amaze and inspire.",
    'break-bumper': "We'll be right back after this short break. Stay tuned to Glee World Radio.",
    'emergency': "Attention! This is an emergency alert from Glee World Radio. Please stand by for important information.",
    'promo-1': eventPromoText,
    'hey-glee': "Hey Glee! You're listening to the sounds of sisterhood on Glee World Radio.",
  };

  const handleLiveInsertion = async (insertion: LiveInsertion) => {
    try {
      if (insertion.type === 'announcement') {
        toast({ 
          title: "Live Announcement", 
          description: "Enter your announcement text below and click the mic button to broadcast"
        });
        setActiveTab('insertions');
        return;
      }

      const script = insertionScripts[insertion.id];
      if (!script) {
        toast({ title: "No Script", description: "No audio script defined for this insertion", variant: "destructive" });
        return;
      }

      setIsBroadcasting(true);
      toast({ 
        title: `Broadcasting: ${insertion.title}`, 
        description: "Generating and sending to radio..."
      });

      const { data, error } = await supabase.functions.invoke('broadcast-announcement', {
        body: { 
          text: script, 
          voiceId: selectedVoice,
          title: insertion.title 
        }
      });

      if (error) throw error;

      toast({ 
        title: "Broadcast Queued", 
        description: `${insertion.title} will play after current song`
      });

      console.log('Live insertion broadcast:', insertion, data);
    } catch (error) {
      console.error('Insertion broadcast error:', error);
      toast({ title: "Broadcast Failed", description: "Could not broadcast insertion", variant: "destructive" });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleBroadcastAnnouncement = async () => {
    if (!announcementText.trim()) {
      toast({ title: "Empty Announcement", description: "Please enter announcement text", variant: "destructive" });
      return;
    }

    try {
      setIsGeneratingTTS(true);
      toast({ title: "Broadcasting...", description: "Generating and sending announcement" });

      const { data, error } = await supabase.functions.invoke('broadcast-announcement', {
        body: { 
          text: announcementText, 
          voiceId: selectedVoice,
          title: 'Live Announcement' 
        }
      });

      if (error) throw error;

      toast({ title: "Announcement Broadcast", description: "Your announcement will play after the current song" });
      setAnnouncementText('');
    } catch (error) {
      console.error('Announcement error:', error);
      toast({ title: "Broadcast Failed", description: "Could not broadcast announcement", variant: "destructive" });
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            DJ Transport Control
            <Badge variant={isConnected ? (isLiveMode ? "destructive" : "default") : "outline"} className="text-xs">
              {isLiveMode ? 'LIVE' : isConnected ? 'Connected' : 'Offline'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onRefresh} className="h-7 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={handleManageInRadioCo} className="h-7 text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              Radio.co Studio
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="transport" className="text-xs">Transport</TabsTrigger>
            <TabsTrigger value="live" className="text-xs">Go Live</TabsTrigger>
            <TabsTrigger value="insertions" className="text-xs">Insertions</TabsTrigger>
          </TabsList>

          <TabsContent value="transport" className="space-y-4 mt-3">
            {/* Now Playing Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase">Now Playing</span>
                <Badge variant={stationState.isOnline ? "default" : "outline"} className="text-xs">
                  {stationState.isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <p className="font-medium truncate">{stationState.currentlyPlaying || 'No track playing'}</p>
              {stationState.currentArtist && (
                <p className="text-sm text-muted-foreground truncate">{stationState.currentArtist}</p>
              )}
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="lg"
                className="h-12 w-24"
                onClick={handlePlayPause}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Master Volume</Label>
                <span className="text-xs text-muted-foreground">{Math.round(masterVolume[0])}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={masterVolume}
                  onValueChange={handleMasterVolumeChange}
                  max={100}
                  step={1}
                  className="flex-1"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="live" className="space-y-4 mt-3">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">DJ Name</Label>
                <Input
                  value={djName}
                  onChange={(e) => setDjName(e.target.value)}
                  placeholder="Enter your DJ name"
                  className="h-8 text-sm"
                />
              </div>

              {!isLiveMode ? (
                <Button
                  onClick={handleGoLive}
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={!djName.trim()}
                >
                  <Radio className="h-4 w-4 mr-2" />
                  Go Live
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="animate-pulse">
                      <span className="mr-1">●</span> LIVE
                    </Badge>
                    <span className="text-sm text-muted-foreground">Broadcasting as {djName}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={isMicMuted ? "outline" : "default"}
                      onClick={handleMicToggle}
                      className="flex-1"
                    >
                      {isMicMuted ? (
                        <><MicOff className="h-4 w-4 mr-2" /> Mic Off</>
                      ) : (
                        <><Mic className="h-4 w-4 mr-2" /> Mic On</>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleEndLive}
                    >
                      End Broadcast
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insertions" className="space-y-4 mt-3">
            <div className="space-y-3">
              <Label className="text-xs">Quick Insertions</Label>
              <div className="grid grid-cols-2 gap-2">
                {presetInsertions.filter(i => i.type !== 'announcement').map(insertion => (
                  <Button
                    key={insertion.id}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleLiveInsertion(insertion)}
                    disabled={isBroadcasting}
                  >
                    {insertion.title}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Custom Announcement</Label>
              <div className="flex gap-2">
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="Voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map(voice => (
                      <SelectItem key={voice.id} value={voice.id} className="text-xs">
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Enter announcement text..."
                className="h-8 text-sm"
              />
              <Button
                onClick={handleBroadcastAnnouncement}
                disabled={!announcementText.trim() || isGeneratingTTS}
                className="w-full h-8 text-xs"
              >
                {isGeneratingTTS ? (
                  <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Broadcasting...</>
                ) : (
                  <><MessageSquare className="h-3 w-3 mr-2" /> Broadcast Announcement</>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
