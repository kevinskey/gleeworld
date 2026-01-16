import React, { useState, useEffect, useMemo } from 'react';
import { Music, Search, Play, Loader2, X, Radio, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { azuraCastService } from '@/services/azuracast';
import { useRadioChannels, RadioChannel } from '@/hooks/useRadioChannels';
import { useAuth } from '@/contexts/AuthContext';

interface RequestableSong {
  request_id: string;
  song: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    art?: string;
    genre?: string;
    playlists?: Array<{ id: number; name: string } | number>;
  };
}

interface SongBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialChannel?: RadioChannel | null;
}

export const SongBrowser: React.FC<SongBrowserProps> = ({
  open,
  onOpenChange,
  initialChannel,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { channels } = useRadioChannels();
  
  const [songs, setSongs] = useState<RequestableSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  const [requestingId, setRequestingId] = useState<string | null>(null);

  // Fetch requestable songs when dialog opens
  useEffect(() => {
    if (open && user) {
      fetchSongs();
    }
  }, [open, user]);

  // Set initial channel when provided
  useEffect(() => {
    if (initialChannel) {
      setSelectedChannelId(initialChannel.id);
    }
  }, [initialChannel]);

  const fetchSongs = async () => {
    setIsLoading(true);
    try {
      const requestableSongs = await azuraCastService.getRequestableSongs();
      console.log('SongBrowser: Fetched', requestableSongs?.length, 'requestable songs');
      setSongs(Array.isArray(requestableSongs) ? requestableSongs : []);
    } catch (error) {
      console.error('SongBrowser: Error fetching songs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load songs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter songs by search query and channel
  const filteredSongs = useMemo(() => {
    let result = songs;

    // Filter by channel/playlist if selected
    if (selectedChannelId !== 'all') {
      const channel = channels.find(c => c.id === selectedChannelId);
      if (channel?.azura_playlist_id) {
        result = result.filter(song => {
          const playlists = song.song?.playlists || [];
          return playlists.some((p) => {
            const pId = typeof p === 'number' ? p : p?.id;
            return pId === channel.azura_playlist_id;
          });
        });
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(song => {
        const title = (song.song?.title || '').toLowerCase();
        const artist = (song.song?.artist || '').toLowerCase();
        const album = (song.song?.album || '').toLowerCase();
        return title.includes(query) || artist.includes(query) || album.includes(query);
      });
    }

    return result;
  }, [songs, selectedChannelId, channels, searchQuery]);

  const handleRequestSong = async (song: RequestableSong) => {
    if (!song.request_id) {
      toast({
        title: 'Cannot Request',
        description: 'This song is not available for request.',
        variant: 'destructive',
      });
      return;
    }

    setRequestingId(song.request_id);
    try {
      await azuraCastService.submitSongRequest(song.request_id);
      toast({
        title: 'Song Requested! 🎵',
        description: `"${song.song?.title}" has been added to the queue.`,
      });
    } catch (error: any) {
      console.error('SongBrowser: Request error:', error);
      const message = error?.message || 'Failed to request song';
      
      // Check for cooldown/duplicate messages
      const isCooldown = message.toLowerCase().includes('recently') || 
                         message.toLowerCase().includes('cooldown') ||
                         message.toLowerCase().includes('wait');
      
      toast({
        title: isCooldown ? 'Song on Cooldown' : 'Request Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Browse & Request Songs
          </DialogTitle>
          <DialogDescription>
            Choose a song to add to the radio queue
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, artist, or album..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Channel Filter */}
          <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Song Count */}
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            'Loading songs...'
          ) : (
            <>
              {filteredSongs.length} song{filteredSongs.length !== 1 ? 's' : ''} available
              {selectedChannelId !== 'all' && ' in this channel'}
            </>
          )}
        </div>

        {/* Song List */}
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Radio className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {songs.length === 0
                  ? 'No songs available for request right now.'
                  : 'No songs match your search.'}
              </p>
              {songs.length === 0 && (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Song requests may be disabled on the station.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredSongs.map((song) => (
                <div
                  key={song.request_id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {/* Album Art */}
                  {song.song?.art ? (
                    <img
                      src={song.song.art}
                      alt={song.song.title}
                      className="h-12 w-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Music className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.song?.title || 'Unknown'}</p>
                    {song.song?.artist && (
                      <p className="text-sm text-muted-foreground truncate">
                        {song.song.artist}
                      </p>
                    )}
                    {song.song?.album && (
                      <p className="text-xs text-muted-foreground/70 truncate">
                        {song.song.album}
                      </p>
                    )}
                  </div>

                  {/* Genre Badge */}
                  {song.song?.genre && (
                    <Badge variant="secondary" className="hidden sm:flex text-xs">
                      {song.song.genre}
                    </Badge>
                  )}

                  {/* Request Button */}
                  <Button
                    size="sm"
                    onClick={() => handleRequestSong(song)}
                    disabled={requestingId === song.request_id}
                    className="flex-shrink-0"
                  >
                    {requestingId === song.request_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Request
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Refresh Button */}
        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" size="sm" onClick={fetchSongs} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Refresh Songs
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SongBrowser;
