import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioStationHeader } from './RadioStationHeader';
import { DragDropTimeline } from './DragDropTimeline';
import { BulkUploadDialog } from './BulkUploadDialog';
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
  Download,
  ArrowLeft,
  Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

      // Fetch ALL audio tracks from multiple sources
      const [musicTracksResult, audioArchiveResult, alumnaeAudioResult] = await Promise.all([
        // Music tracks table
        supabase
          .from('music_tracks')
          .select('id, title, artist, audio_url, duration, play_count, created_at')
          .not('audio_url', 'is', null),
        
        // Audio archive table  
        supabase
          .from('audio_archive')
          .select('id, title, artist_info, audio_url, duration_seconds, play_count, created_at, category')
          .not('audio_url', 'is', null),
          
        // Alumnae audio stories
        supabase
          .from('alumnae_audio_stories')
          .select('id, title, audio_url, duration_seconds, created_at')
          .not('audio_url', 'is', null)
          .eq('is_approved', true)
      ]);

      const allTracks: RadioTrack[] = [];

      // Add music tracks
      if (musicTracksResult.data) {
        musicTracksResult.data.forEach(track => {
          allTracks.push({
            id: `music_${track.id}`,
            title: track.title,
            artist: track.artist || 'Glee Club',
            duration: track.duration || 180,
            audio_url: track.audio_url,
            category: 'performance'
          });
        });
      }

      // Add audio archive tracks
      if (audioArchiveResult.data) {
        audioArchiveResult.data.forEach(track => {
          allTracks.push({
            id: `archive_${track.id}`,
            title: track.title,
            artist: track.artist_info || 'Glee Club',
            duration: track.duration_seconds || 180,
            audio_url: track.audio_url,
            category: track.category as any || 'performance'
          });
        });
      }

      // Add alumnae audio stories
      if (alumnaeAudioResult.data) {
        alumnaeAudioResult.data.forEach(track => {
          allTracks.push({
            id: `alumni_${track.id}`,
            title: track.title,
            artist: 'Alumnae Story',
            duration: track.duration_seconds || 300,
            audio_url: track.audio_url,
            category: 'alumni_story'
          });
        });
      }

      console.log(`Found ${allTracks.length} total audio tracks for radio`);

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

      // Set up all tracks for radio
      if (allTracks.length > 0) {
        // Sort by most recent first
        allTracks.sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());
        
        setUpcomingTracks(allTracks);
        
        // Set the first track as current if no track is playing
        if (!currentTrack && allTracks.length > 0) {
          setCurrentTrack(allTracks[0]);
          console.log('Set default current track:', allTracks[0]);
        }
      } else {
        console.log('No audio tracks found for radio');
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
    const rawArtist = (track.artist || '').trim();
    const safeArtist = /^\[?\s*unknown(?:\s+artist)?\s*\]?$/i.test(rawArtist) || /^n\/a$/i.test(rawArtist) ? '' : rawArtist;

    const radioTrack: RadioTrack = {
      id: track.id,
      title: track.title,
      artist: safeArtist,
      duration: track.duration || 0,
      audio_url: track.audio_url,
      category: track.category || 'performance'
    };

    setCurrentTrack(radioTrack);
    setIsPlaying(true);
  };

  const handlePlay = async () => {
    const audio = audioRef.current;
    console.log('handlePlay called:', { audio: !!audio, currentTrack: !!currentTrack, isPlaying });
    
    if (!audio || !currentTrack) {
      console.log('Cannot play: missing audio element or current track');
      toast({
        title: "Cannot Play",
        description: "No audio track available. Please select a track first.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isPlaying) {
        console.log('Pausing audio');
        audio.pause();
        setIsPlaying(false);
      } else {
        console.log('Playing audio:', currentTrack.audio_url);
        // Make sure the audio source is set
        if (audio.src !== currentTrack.audio_url) {
          audio.src = currentTrack.audio_url;
          console.log('Set audio source to:', currentTrack.audio_url);
        }
        await audio.play();
        setIsPlaying(true);
      }
      
      toast({
        title: isPlaying ? "Radio Paused" : "Radio Playing",
        description: `${currentTrack.title} ${isPlaying ? 'paused' : 'now playing'}`,
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
      toast({
        title: "Playback Error",
        description: "Unable to play audio. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  const handleNextTrack = () => {
    // Always prioritize the timeline schedule
    const nextTrack = getNextTrackRef.current?.();
    
    if (nextTrack) {
      handlePlayTrack(nextTrack);
      toast({
        title: "Next Track",
        description: `Now playing: ${nextTrack.title} (from timeline)`,
      });
    } else {
      // Only pause when no timeline tracks are available
      setIsPlaying(false);
      toast({
        title: "End of Timeline",
        description: "No more tracks scheduled. Please add tracks to the timeline.",
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
      
      {/* Navigation Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-brand-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Navigation */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-brand-700 hover:text-brand-800 hover:bg-brand-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="h-6 w-px bg-brand-200" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-brand-700 hover:text-brand-800 hover:bg-brand-50"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
            </div>
            
            {/* Center - Radio Station Title */}
            <div className="flex items-center gap-3">
              <Radio className="h-6 w-6 text-brand-600" />
              <h1 className="text-xl font-bold text-brand-800 font-playfair">
                Glee World Radio
              </h1>
              {isPlaying && (
                <Badge className="bg-green-100 text-green-800 animate-pulse">
                  LIVE
                </Badge>
              )}
            </div>
            
            {/* Right side - Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                {radioStats.listeners} listeners
              </div>
            </div>
          </div>
        </div>
      </div>
      
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
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-3">
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
            
            {/* Bulk Upload Button */}
            <BulkUploadDialog onUploadComplete={fetchRadioData} />
          </div>
          
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
                  {currentTrack.artist && (
                    <p className="text-lg text-muted-foreground mb-1 font-roboto">
                      {currentTrack.artist}
                    </p>
                  )}
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