import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { azuraCastService } from '@/services/azuracast';
import { cn } from '@/lib/utils';
import {
  Clock,
  Music,
  Plus,
  GripVertical,
  Upload,
  RefreshCw,
  Loader2,
  Radio,
  SkipForward,
  Search
} from 'lucide-react';

interface QueueItem {
  id: number;
  cued_at: number;
  played_at: number;
  duration: number;
  song: {
    id: string;
    title: string;
    artist: string;
    art: string;
  };
}

interface AzuraCastMedia {
  id: number;
  title: string;
  artist: string;
  duration: number;
  art?: string;
  path: string;
}

interface RadioScheduleTimelineProps {
  onRefresh?: () => void;
  currentSongElapsed?: number | null;
  currentSongDuration?: number | null;
  currentSongTitle?: string | null;
}

export const RadioScheduleTimeline = ({ 
  onRefresh, 
  currentSongElapsed = 0, 
  currentSongDuration = 0,
  currentSongTitle = ''
}: RadioScheduleTimelineProps) => {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [availableMedia, setAvailableMedia] = useState<AzuraCastMedia[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddId, setQuickAddId] = useState('');
  const { toast } = useToast();

  // Load queue on mount - media loads on demand
  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      setIsLoading(true);
      const queue = await azuraCastService.getQueue();
      if (Array.isArray(queue)) {
        setQueueItems(queue);
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableMedia = async () => {
    try {
      setIsLoadingMedia(true);
      const media = await azuraCastService.getAllMedia();
      const formatted = media.map((file: any) => ({
        id: file.media?.id || 0,
        title: file.media?.title || file.path_short || 'Unknown',
        artist: file.media?.artist || '',
        duration: file.media?.length || 0,
        art: file.media?.art,
        path: file.path
      })).filter((m: AzuraCastMedia) => m.id > 0);
      setAvailableMedia(formatted);
    } catch (error) {
      console.error('Error loading media:', error);
      toast({ title: "Error", description: "Failed to load media library", variant: "destructive" });
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const quickAddById = async () => {
    const id = parseInt(quickAddId);
    if (isNaN(id) || id <= 0) {
      toast({ title: "Invalid ID", description: "Enter a valid media ID", variant: "destructive" });
      return;
    }
    try {
      setIsRequesting(true);
      await azuraCastService.requestSong(id);
      toast({ title: "Queued", description: `Media ID ${id} added to queue` });
      setQuickAddId('');
      await loadQueue();
      onRefresh?.();
    } catch (error) {
      console.error('Error requesting song:', error);
      toast({ title: "Error", description: "Failed to queue track", variant: "destructive" });
    } finally {
      setIsRequesting(false);
    }
  };

  const filteredMedia = availableMedia.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    // Handle JSON track data from internal drag
    try {
      const trackData = e.dataTransfer.getData('application/json');
      if (trackData) {
        const track = JSON.parse(trackData);
        if (track.mediaId) {
          await requestSong(track.mediaId, track.title);
        }
      }
    } catch (err) {
      console.error('Failed to parse track data:', err);
    }
  };

  const requestSong = async (mediaId: number, title: string) => {
    try {
      setIsRequesting(true);
      await azuraCastService.requestSong(mediaId);
      toast({ 
        title: "Queued", 
        description: `"${title}" added to AzuraCast queue` 
      });
      // Refresh queue after request
      await loadQueue();
      onRefresh?.();
    } catch (error) {
      console.error('Error requesting song:', error);
      toast({ 
        title: "Error", 
        description: "Failed to queue track in AzuraCast", 
        variant: "destructive" 
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const skipCurrentTrack = async () => {
    try {
      await azuraCastService.skipTrack();
      toast({ title: "Skipped", description: "Skipped to next track" });
      await loadQueue();
      onRefresh?.();
    } catch (error) {
      console.error('Error skipping track:', error);
      toast({ 
        title: "Error", 
        description: "Failed to skip track", 
        variant: "destructive" 
      });
    }
  };

  const remainingCurrentSong = Math.max(0, (currentSongDuration || 0) - (currentSongElapsed || 0));
  const totalQueueDuration = queueItems.reduce((acc, item) => acc + (item.duration || 0), 0);

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700">
      <CardHeader className="py-3 px-4 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Radio className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white">AzuraCast Queue</CardTitle>
              <p className="text-xs text-slate-400">Drag tracks to queue on server</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadQueue}
              disabled={isLoading}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            {queueItems.length > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                {queueItems.length} tracks • {formatDuration(totalQueueDuration)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Current Song Info */}
        {currentSongTitle && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Music className="h-4 w-4 text-primary" />
            <span className="font-medium text-white text-sm">Now Playing:</span>
            <span className="truncate flex-1 text-slate-300 text-sm">{currentSongTitle}</span>
            <span className="text-xs text-slate-400">
              {formatDuration(remainingCurrentSong)} left
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipCurrentTrack}
              className="text-slate-400 hover:text-white h-7 px-2"
              title="Skip to next track"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* AzuraCast Queue */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
          </div>
        ) : queueItems.length > 0 ? (
          <div className="space-y-1">
            {queueItems.map((item, index) => (
              <div 
                key={item.id}
                className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg group hover:bg-slate-800 transition-colors"
              >
                <GripVertical className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-slate-400 w-20 flex-shrink-0">
                  {formatTime(item.played_at)}
                </span>
                <Music className="h-4 w-4 text-slate-500" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white truncate block">
                    {item.song?.title || 'Unknown'}
                  </span>
                  {item.song?.artist && (
                    <span className="text-xs text-slate-500 truncate block">
                      {item.song.artist}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {formatDuration(item.duration)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500 text-sm">
            Queue is empty - drag tracks below to add
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center transition-all",
            isDraggingOver 
              ? "border-emerald-500 bg-emerald-500/10" 
              : "border-slate-600 hover:border-slate-500 bg-slate-800/30",
            isRequesting && "opacity-50 pointer-events-none"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "p-2 rounded-full transition-colors",
              isDraggingOver ? "bg-emerald-500/20" : "bg-slate-700"
            )}>
              {isRequesting ? (
                <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
              ) : isDraggingOver ? (
                <Plus className="h-5 w-5 text-emerald-400" />
              ) : (
                <Upload className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <p className={cn(
              "text-sm font-medium",
              isDraggingOver ? "text-emerald-400" : "text-slate-300"
            )}>
              {isRequesting ? "Queueing..." : isDraggingOver ? "Drop to queue" : "Drop tracks here to queue"}
            </p>
          </div>
        </div>

        {/* Quick Add by ID */}
        <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg">
          <Input
            type="number"
            placeholder="Media ID"
            value={quickAddId}
            onChange={(e) => setQuickAddId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && quickAddById()}
            className="w-24 h-8 bg-slate-900 border-slate-600 text-white text-sm"
          />
          <Button 
            size="sm" 
            onClick={quickAddById} 
            disabled={isRequesting || !quickAddId}
            className="h-8"
          >
            {isRequesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Queue
          </Button>
          <span className="text-xs text-slate-500">Quick add by ID</span>
        </div>

        {/* Available Media from AzuraCast - load on demand */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Media Library:</p>
            {availableMedia.length === 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={loadAvailableMedia}
                disabled={isLoadingMedia}
                className="h-7 text-xs"
              >
                {isLoadingMedia ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Load Library
              </Button>
            ) : (
              <span className="text-xs text-slate-500">{availableMedia.length} tracks</span>
            )}
          </div>
          
          {availableMedia.length > 0 && (
            <>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                <Input
                  placeholder="Search tracks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-7 bg-slate-900 border-slate-600 text-white text-sm"
                />
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-1 pr-4">
                  {filteredMedia.slice(0, 50).map((media) => (
                    <div
                      key={media.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          mediaId: media.id,
                          title: media.title,
                          artist: media.artist,
                          duration: media.duration
                        }));
                      }}
                      onClick={() => requestSong(media.id, media.title)}
                      className="flex items-center gap-2 p-2 bg-slate-800/30 rounded cursor-pointer hover:bg-slate-700/50 transition-colors"
                    >
                      <span className="text-xs text-slate-600 w-8">#{media.id}</span>
                      <Music className="h-3 w-3 text-slate-500" />
                      <span className="text-sm text-slate-300 truncate flex-1">
                        {media.title}
                      </span>
                      {media.artist && (
                        <span className="text-xs text-slate-500 truncate max-w-[100px]">
                          {media.artist}
                        </span>
                      )}
                      <span className="text-xs text-slate-600">
                        {formatDuration(media.duration)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RadioScheduleTimeline;
