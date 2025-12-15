import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { azuraCastService } from '@/services/azuracast';
import {
  GripVertical,
  Play,
  Pause,
  Trash2,
  Clock,
  Plus,
  RefreshCw,
  Radio,
  Loader2,
  Music
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueueItem {
  id: number;
  song: {
    id: string;
    text: string;
    artist: string;
    title: string;
    album?: string;
    art?: string;
  };
  played_at: number;
  duration: number;
  cued_at: number;
  is_request: boolean;
}

interface QueueTrackProps {
  item: QueueItem;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}

const QueueTrack = ({ item, index, isPlaying, onPlay, onRemove, isRemoving }: QueueTrackProps) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    const totalSecs = Math.round(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 bg-card border border-border transition-all",
        isPlaying && "bg-primary/10 border-primary/30"
      )}
    >
      {/* Index */}
      <div className="w-8 h-8 flex items-center justify-center bg-muted text-xs font-mono">
        {index + 1}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{item.song?.title || 'Unknown Title'}</h4>
        <p className="text-xs text-muted-foreground truncate">
          {item.song?.artist || 'Unknown Artist'}
        </p>
      </div>

      {/* Cued Time */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {formatTime(item.cued_at)}
      </div>

      {/* Duration */}
      <div className="text-xs text-muted-foreground">
        {formatDuration(item.duration)}
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          disabled={isRemoving}
          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

interface RadioPlaylistQueueProps {
  availableTracks: Array<{
    id: string;
    title: string;
    artist_info: string | null;
    audio_url: string;
    category: string;
    duration_seconds: number | null;
  }>;
  onRefreshTracks: () => void;
}

export const RadioPlaylistQueue = ({ availableTracks, onRefreshTracks }: RadioPlaylistQueueProps) => {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingTrack, setAddingTrack] = useState<string | null>(null);
  const [removingTrack, setRemovingTrack] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch AzuraCast queue directly
  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const [queue, np] = await Promise.all([
        azuraCastService.getQueue(),
        azuraCastService.getNowPlaying()
      ]);
      
      if (Array.isArray(queue)) {
        setQueueItems(queue);
      }
      setNowPlaying(np);
    } catch (error) {
      console.error('Error fetching queue:', error);
      toast({
        title: 'Error',
        description: 'Failed to load queue from AzuraCast',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchQueue();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Normalize title for matching (remove extensions, special chars, extra spaces)
  const normalizeTitle = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/\.(mp3|wav|ogg|flac|m4a|aac)$/i, '') // Remove audio extensions
      .replace(/[_-]/g, ' ') // Replace underscores/dashes with spaces
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  };

  // Add track directly to AzuraCast queue
  const addToQueue = async (track: typeof availableTracks[0]) => {
    setAddingTrack(track.id);
    try {
      // First get AzuraCast media to find the track
      const azuraMedia = await azuraCastService.getAllMedia();
      const trackTitleNorm = normalizeTitle(track.title);
      
      // Try multiple matching strategies
      const match = azuraMedia.find((m: any) => {
        const mediaTitle = normalizeTitle(m.media?.title || '');
        const mediaPath = normalizeTitle(m.path_short || m.path || '');
        const mediaFilename = normalizeTitle((m.path_short || m.path || '').split('/').pop() || '');
        
        // Exact normalized match
        if (mediaTitle === trackTitleNorm || mediaPath === trackTitleNorm || mediaFilename === trackTitleNorm) {
          return true;
        }
        
        // Contains match (either direction)
        if (mediaTitle && trackTitleNorm && (mediaTitle.includes(trackTitleNorm) || trackTitleNorm.includes(mediaTitle))) {
          return true;
        }
        
        // Filename contains match
        if (mediaFilename && trackTitleNorm && (mediaFilename.includes(trackTitleNorm) || trackTitleNorm.includes(mediaFilename))) {
          return true;
        }
        
        return false;
      });

      if (!match?.media?.id) {
        console.log('Track not found in AzuraCast. Local title:', track.title, 'Normalized:', trackTitleNorm);
        console.log('Available AzuraCast media:', azuraMedia.slice(0, 5).map((m: any) => ({
          title: m.media?.title,
          path: m.path_short
        })));
        toast({
          title: 'Track Not Found',
          description: `"${track.title}" is not in AzuraCast media library. Upload it first via Library tab.`,
          variant: 'destructive',
        });
        return;
      }

      await azuraCastService.requestSong(match.media.id, match.media?.title || track.title);
      
      toast({
        title: 'Added to Queue',
        description: `"${track.title}" added to live radio queue`,
      });

      // Refresh queue to show new track
      await fetchQueue();
    } catch (error: any) {
      console.error('Error adding to queue:', error);
      toast({
        title: 'Failed to Add',
        description: error?.message || 'Could not add track to queue',
        variant: 'destructive',
      });
    } finally {
      setAddingTrack(null);
    }
  };

  // Remove track from AzuraCast queue
  const removeFromQueue = async (queueItemId: number) => {
    setRemovingTrack(queueItemId);
    try {
      await azuraCastService.removeFromQueue(queueItemId);
      
      toast({
        title: 'Removed',
        description: 'Track removed from queue',
      });

      // Refresh queue
      await fetchQueue();
    } catch (error) {
      console.error('Error removing from queue:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove track',
        variant: 'destructive',
      });
    } finally {
      setRemovingTrack(null);
    }
  };

  // Handle drop from library
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const trackData = e.dataTransfer.getData('application/json');
    
    if (trackData) {
      try {
        const track = JSON.parse(trackData);
        addToQueue(track);
      } catch (error) {
        console.error('Error parsing dropped track:', error);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const totalSecs = Math.round(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = queueItems.reduce((sum, item) => sum + (item.duration || 0), 0);
  const totalMins = Math.floor(totalDuration / 60);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Live Radio Queue
            <Badge variant="outline" className="ml-2">{queueItems.length} tracks</Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={fetchQueue} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          This is the live AzuraCast queue. Changes are immediate.
        </p>
      </CardHeader>
      <CardContent>
        {/* Now Playing */}
        {nowPlaying?.now_playing?.song && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-primary mb-1">
              <Music className="h-3 w-3" />
              Now Playing
            </div>
            <div className="font-medium">{nowPlaying.now_playing.song.title}</div>
            <div className="text-sm text-muted-foreground">{nowPlaying.now_playing.song.artist}</div>
          </div>
        )}

        {/* Queue Drop Zone */}
        <div
          className="min-h-[300px] border-2 border-dashed border-border p-2 transition-colors hover:border-primary/50 rounded-lg"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {loading ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading queue...
            </div>
          ) : queueItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground gap-2">
              <Plus className="h-8 w-8" />
              <p>Queue is empty</p>
              <p className="text-xs">Drag tracks from the library below to add</p>
            </div>
          ) : (
            <ScrollArea className="h-[350px]">
              <div className="space-y-1">
                {queueItems.map((item, index) => (
                  <QueueTrack
                    key={item.id}
                    item={item}
                    index={index}
                    isPlaying={false}
                    onPlay={() => {}}
                    onRemove={() => removeFromQueue(item.id)}
                    isRemoving={removingTrack === item.id}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        {/* Queue summary */}
        <div className="flex items-center justify-between mt-3 p-2 bg-muted/50 text-xs rounded">
          <span>{queueItems.length} tracks in queue</span>
          <span className="text-muted-foreground">Total: {totalMins}m</span>
        </div>

        {/* Audio Track Library */}
        <div className="mt-6 border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2">
            Audio Track Library • Drag to add to live queue, or click + button
          </p>
          <ScrollArea className="h-[220px]">
            <div className="space-y-1 pr-2">
              {availableTracks.length === 0 ? (
                <div className="flex items-center justify-center h-[120px] text-muted-foreground text-xs">
                  No tracks available. Add audio in the Library tab.
                </div>
              ) : (
                availableTracks.map((track, index) => (
                  <div
                    key={track.id}
                    draggable
                    onDragStart={(e) => {
                      const data = JSON.stringify(track);
                      e.dataTransfer.setData('application/json', data);
                      e.dataTransfer.setData('text/plain', data);
                      e.dataTransfer.effectAllowed = 'copyMove';
                    }}
                    className="flex items-center gap-3 p-2 rounded-md bg-muted/40 hover:bg-muted cursor-grab active:cursor-grabbing text-xs group"
                  >
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted-foreground/10 text-[10px] font-mono text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-foreground text-sm">{track.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {track.artist_info || 'Unknown'} • {formatDuration(track.duration_seconds)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addToQueue(track)}
                      disabled={addingTrack === track.id}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {addingTrack === track.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
