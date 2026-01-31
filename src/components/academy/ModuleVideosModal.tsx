import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, ExternalLink, Clock, X, Loader2 } from 'lucide-react';
import { extractYouTubeVideoId, getYouTubeThumbnail } from '@/utils/youtubeUtils';
import { isTikTokUrl, getTikTokPlaceholderThumbnail } from '@/utils/tiktokUtils';
import { TikTokPlayer } from '@/components/mus240/TikTokPlayer';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ModuleVideo {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  duration: string | null;
  is_required: boolean;
}

interface ModuleVideosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videos: ModuleVideo[];
  weekNumber: number;
  moduleTitle: string;
}

// Cache for TikTok thumbnails fetched via oEmbed
const tiktokThumbnailCache = new Map<string, string>();

export const ModuleVideosModal: React.FC<ModuleVideosModalProps> = ({
  open,
  onOpenChange,
  videos,
  weekNumber,
  moduleTitle
}) => {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const [playingTikTokUrl, setPlayingTikTokUrl] = useState<string | null>(null);
  const [tiktokThumbnails, setTiktokThumbnails] = useState<Record<string, string>>({});

  // Fetch TikTok thumbnails via oEmbed edge function
  useEffect(() => {
    if (!open) return;

    const fetchTikTokThumbnails = async () => {
      const tiktokVideos = videos.filter(v => v.url && isTikTokUrl(v.url));
      
      for (const video of tiktokVideos) {
        if (!video.url) continue;
        
        // Check cache first
        if (tiktokThumbnailCache.has(video.url)) {
          setTiktokThumbnails(prev => ({
            ...prev,
            [video.id]: tiktokThumbnailCache.get(video.url)!,
          }));
          continue;
        }

        try {
          const { data, error } = await supabase.functions.invoke('tiktok-oembed', {
            body: { url: video.url },
          });

          if (!error && data?.success && data?.data?.thumbnailUrl) {
            tiktokThumbnailCache.set(video.url, data.data.thumbnailUrl);
            setTiktokThumbnails(prev => ({
              ...prev,
              [video.id]: data.data.thumbnailUrl,
            }));
          }
        } catch (err) {
          console.warn('Failed to fetch TikTok thumbnail for:', video.url, err);
        }
      }
    };

    fetchTikTokThumbnails();
  }, [open, videos]);

  const handlePlayVideo = (video: ModuleVideo) => {
    if (!video.url) return;
    
    // Check if TikTok
    if (isTikTokUrl(video.url)) {
      setPlayingTikTokUrl(video.url);
      setPlayingVideoId(null);
      setPlayingVideoUrl(null);
      return;
    }
    
    // Check if YouTube
    const videoId = extractYouTubeVideoId(video.url);
    if (videoId) {
      setPlayingVideoId(videoId);
      setPlayingVideoUrl(video.url);
      setPlayingTikTokUrl(null);
    } else {
      // Open external URL
      window.open(video.url, '_blank');
    }
  };

  const closePlayer = () => {
    setPlayingVideoId(null);
    setPlayingVideoUrl(null);
    setPlayingTikTokUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b bg-primary text-primary-foreground">
          <DialogTitle className="flex items-center gap-2 text-primary-foreground">
            <Play className="h-5 w-5" />
            Week {weekNumber} Videos
          </DialogTitle>
          <p className="text-sm text-primary-foreground/80 mt-1">{moduleTitle}</p>
        </DialogHeader>

        {playingVideoId ? (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={closePlayer}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1&rel=0`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : playingTikTokUrl ? (
          <div className="relative p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={closePlayer}
            >
              <X className="h-5 w-5" />
            </Button>
            <TikTokPlayer url={playingTikTokUrl} onClose={closePlayer} />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            {videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Play className="h-12 w-12 mb-3 opacity-50" />
                <p>No videos assigned for this week</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {videos.map((video) => {
                  const isTikTok = video.url ? isTikTokUrl(video.url) : false;
                  const videoId = video.url && !isTikTok ? extractYouTubeVideoId(video.url) : null;
                  const youtubeThumbnail = videoId ? getYouTubeThumbnail(videoId, 'medium') : null;
                  const tiktokThumbnail = isTikTok ? (tiktokThumbnails[video.id] || getTikTokPlaceholderThumbnail()) : null;
                  const thumbnail = youtubeThumbnail || tiktokThumbnail;

                  return (
                    <div
                      key={video.id}
                      onClick={() => handlePlayVideo(video)}
                      className={cn(
                        "flex gap-4 p-3 rounded-lg border cursor-pointer transition-colors",
                        "hover:bg-muted/50 hover:border-primary/30"
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-32 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="h-10 w-10 rounded-full bg-primary/90 flex items-center justify-center">
                            <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                          </div>
                        </div>
                        {/* TikTok badge overlay */}
                        {isTikTok && (
                          <div className="absolute top-1 left-1">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-black/70 text-white border-0">
                              TikTok
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <h4 className="font-medium text-sm line-clamp-2 flex-1">
                            {video.title}
                          </h4>
                          {video.is_required && (
                            <Badge variant="destructive" className="text-xs flex-shrink-0">
                              Required
                            </Badge>
                          )}
                        </div>
                        {video.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {video.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {video.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {video.duration}
                            </span>
                          )}
                          {!videoId && !isTikTok && video.url && (
                            <span className="flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              External Link
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
