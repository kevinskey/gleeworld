import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioStationHeader } from './RadioStationHeader';
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

interface RadioProgram {
  id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  tracks: RadioTrack[];
  is_active: boolean;
}

export const RadioStationPage = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<RadioTrack | null>(null);
  const [currentProgram, setCurrentProgram] = useState<RadioProgram | null>(null);
  const [upcomingTracks, setUpcomingTracks] = useState<RadioTrack[]>([]);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { toast } = useToast();

  // Mock data - in real implementation, this would come from database
  const mockProgram: RadioProgram = {
    id: '1',
    name: 'Glee World 101 - Evening Harmonies',
    description: 'A curated selection of Spelman Glee Club performances and stories',
    start_time: '18:00',
    end_time: '20:00',
    is_active: true,
    tracks: [
      {
        id: '1',
        title: 'Lift Every Voice and Sing',
        artist: 'Spelman College Glee Club',
        album: 'Spring Concert 2024',
        duration: 240,
        audio_url: '/audio/lift-every-voice.mp3',
        category: 'performance'
      },
      {
        id: '2',
        title: 'Welcome to Glee World 101',
        artist: 'Station ID',
        duration: 30,
        audio_url: '/audio/station-id.mp3',
        category: 'announcement'
      },
      {
        id: '3',
        title: 'Memories from Class of 2010',
        artist: 'Sarah Johnson',
        duration: 180,
        audio_url: '/audio/alumni-story-1.mp3',
        category: 'alumni_story'
      }
    ]
  };

  useEffect(() => {
    // Initialize with mock data
    setCurrentProgram(mockProgram);
    setCurrentTrack(mockProgram.tracks[0]);
    setUpcomingTracks(mockProgram.tracks.slice(1));
  }, []);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    toast({
      title: isPlaying ? "Radio Paused" : "Radio Playing",
      description: `Glee World 101 ${isPlaying ? 'paused' : 'now playing'}`,
    });
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
      {/* Radio Station Header */}
      <RadioStationHeader listenerCount={127} isLive={isPlaying} />
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">

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
                    {mockProgram.tracks.map((track, index) => (
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
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
                  onClick={generateRSSFeed}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Rss className="h-4 w-4 mr-2" />
                  Generate RSS Feed
                </Button>
                
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Playlist
                </Button>

                <Button variant="outline" className="w-full">
                  <Music className="h-4 w-4 mr-2" />
                  Media Library
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
                    <p className="text-2xl font-bold text-brand-700">127</p>
                  </div>
                  <div className="bg-spelman-blue-light/20 p-3 rounded-lg">
                    <p className="text-sm text-spelman-blue-dark font-medium">Total Episodes</p>
                    <p className="text-2xl font-bold text-spelman-blue-dark">45</p>
                  </div>
                  <div className="bg-accent/20 p-3 rounded-lg">
                    <p className="text-sm text-accent-foreground font-medium">RSS Subscribers</p>
                    <p className="text-2xl font-bold text-accent-foreground">892</p>
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