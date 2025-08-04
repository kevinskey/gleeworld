import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioStationHeader } from './RadioStationHeader';
import { DragDropTimeline } from './DragDropTimeline';
import { CommercialMaker } from './CommercialMaker';
import { CommercialLibrary } from './CommercialLibrary';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Clock, 
  Radio,
  Music,
  Settings,
  Rss,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RadioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  audio_url: string;
  scheduled_time?: string;
  is_live?: boolean;
  category: 'performance' | 'announcement' | 'interlude' | 'alumni_story';
}

interface Commercial {
  id: string;
  title: string;
  script: string;
  duration: number;
  voice: string;
  audioUrl?: string;
  createdAt: Date;
}

export const RadioStationPage = () => {
  const getNextTrackRef = useRef<(() => any | null) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<RadioTrack | null>(null);
  const [upcomingTracks, setUpcomingTracks] = useState<RadioTrack[]>([]);
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [radioStats, setRadioStats] = useState({
    listeners: 127,
    episodes: 0,
    subscribers: 892
  });
  const [isAdmin, setIsAdmin] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRadioData();
    checkAdminStatus();
    setupAudioEventListeners();
  }, []);

  const setupAudioEventListeners = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      handleNextTrack();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack?.audio_url) {
      audio.src = currentTrack.audio_url;
      audio.volume = volume / 100;
    }
  }, [currentTrack, volume]);

  const fetchRadioData = async () => {
    try {
      // Fetch radio stats - with explicit typing
      const { data: episodesData } = await supabase
        .from('gw_radio_episodes')
        .select('id') as { data: { id: string }[] | null };

      const { data: statsData } = await supabase
        .from('gw_radio_stats')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1);

      // Fetch available audio tracks for the radio
      const { data: tracksData } = await supabase
        .from('audio_archive')
        .select('id, title, artist_info, audio_url, duration_seconds, category')
        .eq('is_public', true)
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (episodesData) {
        setRadioStats(prev => ({
          ...prev,
          episodes: episodesData.length
        }));
      }

      if (statsData && statsData.length > 0) {
        setRadioStats(prev => ({
          ...prev,
          listeners: statsData[0].unique_listeners || 127,
          subscribers: 892 // Keep default value for now
        }));
      }

      // Set up default tracks and current track
      if (tracksData && tracksData.length > 0) {
        const radioTracks: RadioTrack[] = tracksData.map(track => ({
          id: track.id,
          title: track.title,
          artist: track.artist_info || 'Glee Club',
          duration: track.duration_seconds || 180,
          audio_url: track.audio_url,
          category: (track.category === 'performance' || track.category === 'announcement' || track.category === 'interlude' || track.category === 'alumni_story') 
            ? track.category 
            : 'performance'
        }));
        
        setUpcomingTracks(radioTracks);
        
        // Set the first track as current if no track is playing
        if (!currentTrack && radioTracks.length > 0) {
          setCurrentTrack(radioTracks[0]);
        }
      }

    } catch (error) {
      console.error('Error fetching radio data:', error);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profile) {
        setIsAdmin(profile.is_admin || profile.is_super_admin);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handlePlayTrack = (track: any) => {
    const radioTrack: RadioTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      duration: track.duration || 0,
      audio_url: track.audio_url,
      category: track.category || 'performance'
    };

    setCurrentTrack(radioTrack);
    setIsPlaying(true);
  };

  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
      
      toast({
        title: isPlaying ? "Radio Paused" : "Radio Playing",
        description: `${currentTrack.title} ${isPlaying ? 'paused' : 'now playing'}`,
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      toast({
        title: "Playback Error",
        description: "Unable to play audio. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  const handleNextTrack = () => {
    // Try to get next track from timeline loop
    const nextTrack = getNextTrackRef.current?.();
    
    if (nextTrack) {
      handlePlayTrack(nextTrack);
      toast({
        title: "Next Track",
        description: `Now playing: ${nextTrack.title}`,
      });
    } else {
      // No tracks scheduled, stop playing
      setIsPlaying(false);
      setCurrentTrack(null);
      toast({
        title: "Playlist Empty",
        description: "No more tracks scheduled. Add tracks to continue.",
      });
    }
  };

  const handleUpdateCurrentSlot = (slotId: string) => {
    // This gets called when the timeline updates the current playing slot
    console.log('Current slot updated to:', slotId);
  };

  const handlePrevTrack = () => {
    // Implementation for previous track
    console.log('Previous track');
  };

  const handleCommercialCreated = (commercial: Commercial) => {
    setCommercials(prev => [...prev, commercial]);
  };

  const handleCommercialDelete = (id: string) => {
    setCommercials(prev => prev.filter(c => c.id !== id));
  };

  const handleCommercialPlay = (commercial: Commercial) => {
    if (commercial.audioUrl) {
      const commercialTrack: RadioTrack = {
        id: commercial.id,
        title: commercial.title,
        artist: 'Commercial',
        duration: commercial.duration,
        audio_url: commercial.audioUrl,
        category: 'announcement'
      };
      handlePlayTrack(commercialTrack);
    }
  };

  const handleAddToTimeline = (commercial: Commercial) => {
    // This will be handled by the DragDropTimeline component
    // For now, we just show a success message
    console.log('Adding commercial to timeline:', commercial);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-brand-50 to-brand-100">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} preload="metadata" />
      
      {/* Radio Station Header */}
      <RadioStationHeader 
        listenerCount={radioStats.listeners} 
        isLive={isPlaying}
        isPlaying={isPlaying}
        onPlayToggle={handlePlay}
        currentTrack={currentTrack ? {
          title: currentTrack.title,
          artist: currentTrack.artist
        } : null}
      />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Radio Station Tabs */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Radio Timeline
            </TabsTrigger>
            <TabsTrigger value="commercial-maker" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Commercial Maker
            </TabsTrigger>
            <TabsTrigger value="commercial-library" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Commercial Library
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="mt-6">
            <DragDropTimeline 
              onTrackPlay={handlePlayTrack}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onGetNextTrack={getNextTrackRef}
              onUpdateCurrentSlot={handleUpdateCurrentSlot}
            />
          </TabsContent>
          
          <TabsContent value="commercial-maker" className="mt-6">
            <CommercialMaker onCommercialCreated={handleCommercialCreated} />
          </TabsContent>
          
          <TabsContent value="commercial-library" className="mt-6">
            <CommercialLibrary 
              commercials={commercials}
              onCommercialDelete={handleCommercialDelete}
              onCommercialPlay={handleCommercialPlay}
              onAddToTimeline={handleAddToTimeline}
            />
          </TabsContent>
        </Tabs>

        {/* Now Playing Card */}
        {currentTrack && (
          <Card className="overflow-hidden shadow-lg border-2 border-brand-200">
            <CardHeader className="bg-gradient-to-r from-brand-600 to-spelman-blue-dark text-white">
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Now Playing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Track Info */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-2 font-playfair">
                    {currentTrack.title}
                  </h3>
                  <p className="text-lg text-muted-foreground mb-1 font-roboto">
                    {currentTrack.artist}
                  </p>
                  <Badge className="mt-2 bg-brand-100 text-brand-800">
                    <Music className="h-4 w-4 mr-1" />
                    <span className="capitalize">{currentTrack.category.replace('_', ' ')}</span>
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-brand-600 to-spelman-blue-dark h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevTrack}
                    className="hover:bg-brand-50 border-brand-200"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="icon"
                    onClick={handlePlay}
                    className="h-14 w-14 bg-gradient-to-r from-brand-600 to-spelman-blue-dark hover:from-brand-700 hover:to-spelman-blue-dark/90"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6 ml-1" />
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextTrack}
                    className="hover:bg-brand-50 border-brand-200"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">{volume}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Station Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Station Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-brand-50 p-3 rounded-lg">
                  <p className="text-sm text-brand-600 font-medium">Current Listeners</p>
                  <p className="text-2xl font-bold text-brand-700">{radioStats.listeners}</p>
                </div>
                <div className="bg-spelman-blue-light/20 p-3 rounded-lg">
                  <p className="text-sm text-spelman-blue-dark font-medium">Total Episodes</p>
                  <p className="text-2xl font-bold text-spelman-blue-dark">{radioStats.episodes}</p>
                </div>
                <div className="bg-accent/20 p-3 rounded-lg">
                  <p className="text-sm text-accent-foreground font-medium">RSS Subscribers</p>
                  <p className="text-2xl font-bold text-accent-foreground">{radioStats.subscribers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Station Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Schedule
              </Button>

              <Button variant="outline" className="w-full">
                <Rss className="h-4 w-4 mr-2" />
                Generate RSS Feed
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SkipForward className="h-5 w-5" />
                Up Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                {upcomingTracks.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingTracks.slice(0, 3).map((track, index) => (
                      <div key={track.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No upcoming tracks</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};