import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Search, 
  Filter, 
  Music, 
  Radio,
  Calendar,
  Clock,
  Plus,
  Volume2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface MediaLibraryProps {
  onAddToPlaylist?: (track: MusicTrack | AudioArchive) => void;
  onPlayTrack?: (track: MusicTrack | AudioArchive) => void;
  isPlaying?: boolean;
  currentTrack?: string;
}

export const MediaLibrary = ({ 
  onAddToPlaylist, 
  onPlayTrack, 
  isPlaying = false, 
  currentTrack 
}: MediaLibraryProps) => {
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [audioArchive, setAudioArchive] = useState<AudioArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('music-tracks');
  const { toast } = useToast();

  useEffect(() => {
    fetchMediaData();
  }, []);

  const fetchMediaData = async () => {
    try {
      setLoading(true);
      
      // Fetch music tracks
      const { data: musicData, error: musicError } = await supabase
        .from('music_tracks')
        .select(`
          id,
          title,
          artist,
          duration,
          audio_url,
          genre,
          play_count,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (musicError) {
        console.error('Error fetching music tracks:', musicError);
      } else {
        const formattedMusic = musicData?.map(track => ({
          ...track,
          category: 'performance' as const
        })) || [];
        setMusicTracks(formattedMusic);
      }

      // Fetch audio archive
      const { data: archiveData, error: archiveError } = await supabase
        .from('audio_archive')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (archiveError) {
        console.error('Error fetching audio archive:', archiveError);
      } else {
        setAudioArchive(archiveData || []);
      }

    } catch (error) {
      console.error('Error fetching media data:', error);
      toast({
        title: "Error",
        description: "Failed to load media library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filterTracks = (tracks: (MusicTrack | AudioArchive)[]) => {
    return tracks.filter(track => {
      const artist = 'artist' in track ? track.artist : track.artist_info;
      const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (artist || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = filterCategory === 'all' || 
                             track.category === filterCategory ||
                             (!track.category && filterCategory === 'performance');
      
      return matchesSearch && matchesCategory;
    });
  };

  const handleAddToRadio = async (track: MusicTrack | AudioArchive) => {
    if (onAddToPlaylist) {
      onAddToPlaylist(track);
      toast({
        title: "Added to Radio",
        description: `"${track.title}" has been added to the radio playlist`,
      });
    }
  };

  const handlePlayTrack = (track: MusicTrack | AudioArchive) => {
    if (onPlayTrack) {
      onPlayTrack(track);
    }
  };

  const renderTrackCard = (track: MusicTrack | AudioArchive) => {
    const isCurrentlyPlaying = currentTrack === track.id && isPlaying;
    const artist = 'artist' in track ? track.artist : track.artist_info;
    const duration = 'duration' in track ? track.duration : track.duration_seconds;

    return (
      <Card key={track.id} className="mb-3 hover:shadow-md transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Play Button */}
            <Button
              size="sm"
              variant={isCurrentlyPlaying ? "default" : "outline"}
              onClick={() => handlePlayTrack(track)}
              className="flex-shrink-0"
            >
              {isCurrentlyPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">
                {track.title}
              </h4>
              <p className="text-sm text-muted-foreground truncate">
                {artist || 'Unknown Artist'}
              </p>
              {'album' in track && track.album && (
                <p className="text-xs text-muted-foreground/70">{track.album}</p>
              )}
            </div>

            {/* Metadata */}
            <div className="flex-shrink-0 text-right">
              <div className="flex items-center gap-2 mb-1">
                {track.category && (
                  <Badge variant="outline" className="text-xs">
                    {track.category.replace('_', ' ')}
                  </Badge>
                )}
                {duration && (
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(duration)}
                  </span>
                )}
              </div>
              
              {/* Add to Radio Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAddToRadio(track)}
                className="text-xs h-6 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add to Radio
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading media library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2 font-playfair">
          Media Library
        </h2>
        <p className="text-muted-foreground">
          Browse and manage audio content for Glee World 101
        </p>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="alumni_story">Alumni Story</SelectItem>
                <SelectItem value="interlude">Interlude</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="music-tracks" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Music Tracks ({musicTracks.length})
          </TabsTrigger>
          <TabsTrigger value="audio-archive" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Audio Archive ({audioArchive.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="music-tracks" className="mt-6">
          <ScrollArea className="h-96">
            {filterTracks(musicTracks).length > 0 ? (
              <div className="space-y-2">
                {filterTracks(musicTracks).map(renderTrackCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || filterCategory !== 'all' 
                    ? 'No tracks found matching your criteria' 
                    : 'No music tracks available'}
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="audio-archive" className="mt-6">
          <ScrollArea className="h-96">
            {filterTracks(audioArchive).length > 0 ? (
              <div className="space-y-2">
                {filterTracks(audioArchive).map(renderTrackCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || filterCategory !== 'all' 
                    ? 'No archive content found matching your criteria' 
                    : 'No audio archive content available'}
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};