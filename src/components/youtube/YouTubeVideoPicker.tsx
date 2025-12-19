import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GLEE_CLUB_CHANNEL_ID } from '@/utils/youtubeUtils';
import { Play, Check, Loader2, RefreshCw, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration: string;
  published_at: string;
  view_count: number;
  is_featured?: boolean;
}

interface YouTubeVideoPickerProps {
  onSelect?: (video: YouTubeVideo) => void;
  onMultiSelect?: (videos: YouTubeVideo[]) => void;
  selectedVideoIds?: string[];
  multiSelect?: boolean;
  maxHeight?: string;
  showSyncButton?: boolean;
  className?: string;
}

export const YouTubeVideoPicker: React.FC<YouTubeVideoPickerProps> = ({
  onSelect,
  onMultiSelect,
  selectedVideoIds = [],
  multiSelect = false,
  maxHeight = '500px',
  showSyncButton = true,
  className,
}) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedVideoIds));

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    setSelected(new Set(selectedVideoIds));
  }, [selectedVideoIds]);

  const fetchVideos = async () => {
    try {
      setLoading(true);

      // Get the channel row for the official Spelman Glee Club
      const { data: channelRow } = await supabase
        .from('youtube_channels')
        .select('id')
        .eq('channel_id', GLEE_CLUB_CHANNEL_ID)
        .limit(1)
        .maybeSingle();

      if (!channelRow?.id) {
        setVideos([]);
        return;
      }

      const { data, error } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('channel_id', channelRow.id)
        .order('published_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error('Error fetching YouTube videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await supabase.functions.invoke('sync-youtube-videos', {
        body: { channelInput: '@SpelmanCollegeGleeClub', maxResults: 50 }
      });
      await fetchVideos();
    } catch (err) {
      console.error('Error syncing videos:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleVideoClick = (video: YouTubeVideo) => {
    if (multiSelect) {
      const newSelected = new Set(selected);
      if (newSelected.has(video.video_id)) {
        newSelected.delete(video.video_id);
      } else {
        newSelected.add(video.video_id);
      }
      setSelected(newSelected);
      onMultiSelect?.(videos.filter(v => newSelected.has(v.video_id)));
    } else {
      setSelected(new Set([video.video_id]));
      onSelect?.(video);
    }
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count?.toString() || '0';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading videos...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-destructive" />
          <h3 className="font-semibold text-foreground">
            Channel Videos
          </h3>
          <Badge variant="secondary" className="ml-2">
            {videos.length} videos
          </Badge>
        </div>
        {showSyncButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync Videos'}
          </Button>
        )}
      </div>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Youtube className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No videos found. Click "Sync Videos" to fetch from YouTube.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea style={{ maxHeight }} className="pr-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => {
              const isSelected = selected.has(video.video_id);
              return (
                <Card
                  key={video.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden group",
                    isSelected && "ring-2 ring-primary border-primary"
                  )}
                  onClick={() => handleVideoClick(video)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video">
                    <img
                      src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay */}
                    <div className={cn(
                      "absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity",
                      isSelected ? "opacity-100 bg-primary/40" : "opacity-0 group-hover:opacity-100"
                    )}>
                      {isSelected ? (
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-6 w-6 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="h-6 w-6 text-foreground ml-1" fill="currentColor" />
                        </div>
                      )}
                    </div>

                    {/* Duration badge */}
                    {video.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
                        {video.duration}
                      </span>
                    )}

                    {/* Featured badge */}
                    {video.is_featured && (
                      <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
                        Featured
                      </Badge>
                    )}
                  </div>

                  {/* Info */}
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-2">
                      {video.title}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatViewCount(video.view_count)} views</span>
                      <span>{formatDate(video.published_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Selection summary for multi-select */}
      {multiSelect && selected.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm text-foreground">
            <strong>{selected.size}</strong> video{selected.size !== 1 ? 's' : ''} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelected(new Set());
              onMultiSelect?.([]);
            }}
          >
            Clear selection
          </Button>
        </div>
      )}
    </div>
  );
};

export default YouTubeVideoPicker;
