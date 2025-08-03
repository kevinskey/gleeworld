import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioStationHeader } from './RadioStationHeader';
import { MediaLibraryDialog } from './MediaLibraryDialog';
import { RadioTimeline } from './RadioTimeline';
import { PlaylistManager } from './PlaylistManager';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Clock, 
  Calendar,
  Mic,
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

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  audio_url: string;
  genre?: string;
  play_count: number;
  created_at: string;
  category?: 'performance' | 'announcement' | 'interlude' | 'alumni_story';
}

interface AudioArchive {
  id: string;
  title: string;
  artist_info?: string;
  audio_url: string;
  duration_seconds?: number;
  category: string;
  performance_date?: string;
  created_at: string;
}

export const RadioStationPage = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<RadioTrack | null>(null);
  const [playlist, setPlaylist] = useState<RadioTrack[]>([]);
  const [upcomingTracks, setUpcomingTracks] = useState<RadioTrack[]>([]);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [radioStats, setRadioStats] = useState({
    listeners: 127,
    episodes: 0,
    subscribers: 892
  });
  const [isAdmin, setIsAdmin] = useState(false);
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
      // Fetch current playlist from database - simplified query
      const { data: playlistData, error: playlistError } = await supabase
        .from('gw_radio_playlists')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (playlistError) {
        console.error('Error fetching playlist:', playlistError);
      }

      // Fetch radio stats - with explicit typing
      const { data: episodesData } = await supabase
        .from('gw_radio_episodes')
        .select('id') as { data: { id: string }[] | null };

      const { data: statsData } = await supabase
        .from('gw_radio_stats')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1);

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

  const handleAddToPlaylist = (track: MusicTrack | AudioArchive) => {
    // Convert track to RadioTrack format
    const radioTrack: RadioTrack = {
      id: track.id,
      title: track.title,
      artist: 'artist' in track ? track.artist : track.artist_info || 'Unknown Artist',
      duration: 'duration' in track ? track.duration : track.duration_seconds || 0,
      audio_url: track.audio_url,
      category: (track.category as RadioTrack['category']) || 'performance'
    };

    setPlaylist(prev => [...prev, radioTrack]);
    
    // If no current track, start playing this one
    if (!currentTrack) {
      setCurrentTrack(radioTrack);
      setUpcomingTracks(prev => [...prev, ...playlist.slice(1)]);
    } else {
      setUpcomingTracks(prev => [...prev, radioTrack]);
    }
  };

  const handlePlaylistUpdate = (newPlaylist: RadioTrack[]) => {
    setPlaylist(newPlaylist);
    // Update upcoming tracks to exclude current track
    const currentIndex = newPlaylist.findIndex(track => track.id === currentTrack?.id);
    if (currentIndex !== -1) {
      setUpcomingTracks(newPlaylist.slice(currentIndex + 1));
    } else {
      setUpcomingTracks(newPlaylist);
    }
  };

  const handleRemoveTrack = (trackId: string) => {
    if (currentTrack?.id === trackId) {
      toast({
        title: "Cannot Remove",
        description: "Cannot remove the currently playing track",
        variant: "destructive",
      });
      return;
    }

    const newPlaylist = playlist.filter(track => track.id !== trackId);
    setPlaylist(newPlaylist);
    setUpcomingTracks(newPlaylist.filter(track => track.id !== currentTrack?.id));
    
    toast({
      title: "Track Removed",
      description: "Track has been removed from playlist",
    });
  };

  const handlePlayTrack = (track: MusicTrack | AudioArchive) => {
    const radioTrack: RadioTrack = {
      id: track.id,
      title: track.title,
      artist: 'artist' in track ? track.artist : track.artist_info || 'Unknown Artist',
      duration: 'duration' in track ? track.duration : track.duration_seconds || 0,
      audio_url: track.audio_url,
      category: (track.category as RadioTrack['category']) || 'performance'
    };

    setCurrentTrack(radioTrack);
    setIsPlaying(true);
    setShowMediaLibrary(false);
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
    if (upcomingTracks.length > 0) {
      const nextTrack = upcomingTracks[0];
      setCurrentTrack(nextTrack);
      setUpcomingTracks(prev => prev.slice(1));
    }
  };

  const handlePrevTrack = () => {
    // Implementation for previous track
    console.log('Previous track');
  };

  const handlePlayRadioTrack = (track: RadioTrack) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const generateRSSFeed = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-radio-rss');
      if (error) throw error;
      
      toast({
        title: "RSS Feed Generated",
        description: "RSS feed has been updated with latest episodes",
      });
    } catch (error) {
      console.error('Error generating RSS feed:', error);
      toast({
        title: "Error",
        description: "Failed to generate RSS feed",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance':
        return <Music className="h-4 w-4" />;
      case 'announcement':
        return <Mic className="h-4 w-4" />;
      case 'alumni_story':
        return <Radio className="h-4 w-4" />;
      default:
        return <Music className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'performance':
        return 'bg-brand-100 text-brand-800';
      case 'announcement':
        return 'bg-spelman-blue-light/20 text-spelman-blue-dark';
      case 'alumni_story':
        return 'bg-accent/20 text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-brand-50 to-brand-100">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} preload="metadata" />
      
      {/* Radio Station Header */}
      <RadioStationHeader listenerCount={radioStats.listeners} isLive={isPlaying} />
      
      {/* Media Library Dialog */}
      <MediaLibraryDialog
        open={showMediaLibrary}
        onOpenChange={setShowMediaLibrary}
        onAddToPlaylist={handleAddToPlaylist}
        onPlayTrack={handlePlayTrack}
        isPlaying={isPlaying}
        currentTrack={currentTrack?.id}
      />
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Radio Timeline */}
        <RadioTimeline
          currentTrack={currentTrack}
          upcomingTracks={upcomingTracks}
          currentTime={currentTime}
          isPlaying={isPlaying}
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Player */}
          <div className="lg:col-span-2 space-y-6">
            {/* Now Playing */}
            <Card className="overflow-hidden shadow-lg border-2 border-brand-200">
              <CardHeader className="bg-gradient-to-r from-brand-600 to-spelman-blue-dark text-white">
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  Now Playing
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {currentTrack && (
                  <div className="space-y-6">
                     {/* Track Info */}
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-foreground mb-2 font-playfair">
                        {currentTrack.title}
                      </h3>
                      <p className="text-lg text-muted-foreground mb-1 font-roboto">
                        {currentTrack.artist}
                      </p>
                      {currentTrack.album && (
                        <p className="text-sm text-muted-foreground/70">{currentTrack.album}</p>
                      )}
                      <Badge className={`mt-2 ${getCategoryColor(currentTrack.category)}`}>
                        {getCategoryIcon(currentTrack.category)}
                        <span className="ml-1 capitalize">{currentTrack.category.replace('_', ' ')}</span>
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
                )}
              </CardContent>
            </Card>

            {/* Program Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today's Programming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {playlist.length > 0 ? (
                      playlist.map((track, index) => (
                        <div
                          key={track.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            currentTrack?.id === track.id 
                              ? 'bg-brand-50 border-2 border-brand-200' 
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                        <div className="flex-shrink-0">
                          {getCategoryIcon(track.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {track.title}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {track.artist}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <Badge variant="outline" className={getCategoryColor(track.category)}>
                            {track.category.replace('_', ' ')}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(track.duration)}
                          </p>
                        </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Music className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No tracks in playlist</p>
                        <p className="text-sm text-muted-foreground/70">Use the Media Library to add tracks</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Playlist Manager - Admin Only */}
            {isAdmin && (
              <PlaylistManager
                playlist={playlist}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlaylistUpdate={handlePlaylistUpdate}
                onPlayTrack={handlePlayRadioTrack}
                onRemoveTrack={handleRemoveTrack}
                canEdit={isAdmin}
              />
            )}

            {/* Station Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Station Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setShowMediaLibrary(true)}
                  className="w-full bg-gradient-to-r from-brand-600 to-spelman-blue-dark hover:from-brand-700 hover:to-spelman-blue-dark/90"
                >
                  <Music className="h-4 w-4 mr-2" />
                  Open Media Library
                </Button>

                {/* Temporary Admin Access Button - For Testing */}
                <Button
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => setIsAdmin(true)}
                >
                  🔧 {isAdmin ? 'Admin Mode Active' : 'Enable Admin Mode (Testing)'}
                </Button>
                
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Playlist
                </Button>

                <Button variant="outline" className="w-full">
                  <Rss className="h-4 w-4 mr-2" />
                  Generate RSS Feed
                </Button>
              </CardContent>
            </Card>

            {/* Live Stats */}
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

            {/* Upcoming */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SkipForward className="h-5 w-5" />
                  Up Next
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                     {upcomingTracks.slice(0, 5).map((track, index) => (
                       <div key={track.id} className="flex items-center gap-3">
                         <div className="flex-shrink-0 w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs text-muted-foreground">
                           {index + 1}
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-medium text-foreground truncate">
                             {track.title}
                           </p>
                           <p className="text-xs text-muted-foreground truncate">
                             {track.artist}
                           </p>
                         </div>
                       </div>
                     ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};