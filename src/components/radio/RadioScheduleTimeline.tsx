import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { azuraCastService } from '@/services/azuracast';
import { supabase } from '@/integrations/supabase/client';
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
  Search,
  Trash2
} from 'lucide-react';

interface QueueItem {
  id?: number;
  cue_id?: number;
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

// Helper to extract queue item ID (AzuraCast may use different field names)
const getQueueItemId = (item: QueueItem): number | undefined => {
  return item.id ?? item.cue_id ?? (item as any).queue_id;
};

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddId, setQuickAddId] = useState('');
  const lastDraggedMediaRef = useRef<AzuraCastMedia | null>(null);
  const { toast } = useToast();

  // Load queue on mount - media loads on demand
  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      setIsLoading(true);
      const queue = await azuraCastService.getQueue();
      if (Array.isArray(queue) && queue.length > 0) {
        // Log the first item's keys to debug ID field name
        const firstItem = queue[0];
        console.log('AzuraCast queue item keys:', Object.keys(firstItem));
        console.log('AzuraCast queue item sample:', { 
          id: firstItem.id, 
          cue_id: (firstItem as any).cue_id,
          queue_id: (firstItem as any).queue_id,
          song_id: firstItem.song?.id 
        });
        setQueueItems(queue);
      } else {
        setQueueItems([]);
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
      // Try to find title from loaded media, or use ID as fallback
      const mediaItem = availableMedia.find(m => m.id === id);
      const title = mediaItem?.title || `Media #${id}`;
      await azuraCastService.requestSong(id, title);
      toast({ title: "Queued", description: `"${title}" added to queue` });
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
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const types = Array.from(e.dataTransfer.types);
    console.log('Drop received, types:', types);

    // Handle external file drops
    if (types.includes('Files') && !types.includes('application/json') && !types.includes('text/plain')) {
      const files = Array.from(e.dataTransfer.files);
      const audioFiles = files.filter(f => 
        f.type.startsWith('audio/') || 
        /\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(f.name)
      );
      
      if (audioFiles.length === 0) {
        toast({ 
          title: "Invalid File Type", 
          description: "Please drop audio files (MP3, WAV, M4A, etc.)", 
          variant: "destructive" 
        });
        return;
      }

      // Upload and queue the first audio file
      await uploadAndQueueFile(audioFiles[0]);
      return;
    }

    // Handle JSON track data from internal drag
    try {
      let trackData = e.dataTransfer.getData('application/json');
      if (!trackData) {
        trackData = e.dataTransfer.getData('text/plain');
      }
      if (!trackData) {
        trackData = e.dataTransfer.getData('text');
      }
      
      console.log('Drop trackData:', trackData);
      
      if (trackData) {
        const track = JSON.parse(trackData);
        console.log('Parsed track:', track);
        if (track.mediaId) {
          await requestSong(track.mediaId, track.title);
          return;
        } else if (track.id) {
          await requestSong(track.id, track.title);
          return;
        }
      }

      // Fallback: use last dragged media from ref
      if (lastDraggedMediaRef.current) {
        const media = lastDraggedMediaRef.current;
        console.log('Using lastDraggedMediaRef fallback:', media);
        await requestSong(media.id, media.title);
        lastDraggedMediaRef.current = null;
        return;
      }
      
      toast({ title: "Drop Failed", description: "Could not identify track. Try clicking the track instead.", variant: "destructive" });
    } catch (err) {
      console.error('Failed to parse track data:', err);
      toast({ title: "Drop Error", description: "Failed to process dropped track", variant: "destructive" });
    }
  };

  const uploadAndQueueFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadStatus('Uploading to storage...');
      
      // Generate unique filename
      const timestamp = Date.now();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `radio-uploads/${timestamp}_${safeFileName}`;
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(storagePath, file, { 
          cacheControl: '3600',
          upsert: false 
        });
      
      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(storagePath);
      
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }
      
      setUploadStatus('Uploading to AzuraCast...');
      
      // Extract title from filename
      const title = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      
      // Upload to AzuraCast
      const result = await azuraCastService.uploadMediaFromUrl(
        urlData.publicUrl,
        safeFileName,
        title,
        '',
        (status) => setUploadStatus(status)
      );
      
      setUploadStatus('Queueing track...');
      
      // Queue the uploaded track
      if (result?.media_id) {
        await azuraCastService.requestSong(result.media_id, title);
        toast({ 
          title: "Uploaded & Queued", 
          description: `"${title}" has been uploaded and added to queue` 
        });
      } else {
        toast({ 
          title: "Uploaded", 
          description: `"${title}" uploaded to library. Load Library to queue it.` 
        });
      }
      
      await loadQueue();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({ 
        title: "Upload Failed", 
        description: error.message || "Failed to upload file", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const requestSong = async (mediaId: number, title: string) => {
    try {
      setIsRequesting(true);
      await azuraCastService.requestSong(mediaId, title);
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
      toast({ title: "Error", description: "Failed to skip track", variant: "destructive" });
    }
  };

  const clearQueue = async () => {
    try {
      setIsLoading(true);
      await azuraCastService.clearQueue();
      toast({ title: "Cleared", description: "Queue has been cleared" });
      await loadQueue();
      onRefresh?.();
    } catch (error) {
      console.error('Error clearing queue:', error);
      toast({ title: "Error", description: "Failed to clear queue", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const removeQueueItem = async (queueItemId: number) => {
    try {
      await azuraCastService.removeFromQueue(queueItemId);
      toast({ title: "Removed", description: "Track removed from queue" });
      await loadQueue();
      onRefresh?.();
    } catch (error) {
      console.error('Error removing from queue:', error);
      toast({ title: "Error", description: "Failed to remove track from queue", variant: "destructive" });
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
            {queueItems.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearQueue}
                disabled={isLoading}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                title="Clear entire queue"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
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
            {queueItems.map((item, index) => {
              const key = String(getQueueItemId(item) ?? item.song?.id ?? index);
              return (
                <div 
                  key={key}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const queueId = getQueueItemId(item);
                    if (queueId) {
                      removeQueueItem(queueId);
                    } else {
                      console.error('No queue ID found for item:', item);
                      toast({ title: "Error", description: "Cannot identify queue item", variant: "destructive" });
                    }
                  }}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                  title="Remove from queue"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                </div>
              );
            })}
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
            (isRequesting || isUploading) && "opacity-50 pointer-events-none"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "p-2 rounded-full transition-colors",
              isDraggingOver ? "bg-emerald-500/20" : "bg-slate-700"
            )}>
              {(isRequesting || isUploading) ? (
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
              {isUploading 
                ? uploadStatus || "Uploading..." 
                : isRequesting 
                  ? "Queueing..." 
                  : isDraggingOver 
                    ? "Drop to queue" 
                    : "Drop tracks or audio files here"}
            </p>
            {!isUploading && !isRequesting && !isDraggingOver && (
              <p className="text-xs text-slate-500">
                Supports MP3, WAV, M4A, OGG, FLAC
              </p>
            )}
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
                        const data = JSON.stringify({
                          mediaId: media.id,
                          title: media.title,
                          artist: media.artist,
                          duration: media.duration
                        });
                        e.dataTransfer.setData('application/json', data);
                        e.dataTransfer.setData('text/plain', data);
                        e.dataTransfer.effectAllowed = 'copy';
                        // Store as fallback for browsers that lose dataTransfer
                        lastDraggedMediaRef.current = media;
                        console.log('Drag started for media:', media.id, media.title);
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
