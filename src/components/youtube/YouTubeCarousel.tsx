import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Youtube } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { YouTubeVideoModal } from '@/components/youtube/YouTubeVideoModal';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string;
  view_count: number;
  duration: string | null;
}

const formatViewCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

interface YouTubeCarouselProps {
  limit?: number;
  showTitle?: boolean;
  className?: string;
}

export const YouTubeCarousel: React.FC<YouTubeCarouselProps> = ({
  limit = 12,
  showTitle = true,
  className = ''
}) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);

  useEffect(() => {
    fetchVideos();
  }, [limit]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('youtube_videos')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVideoThumbnail = (video: YouTubeVideo) => {
    if (video.thumbnail_url) return video.thumbnail_url;
    return `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`;
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showTitle && (
          <div className="text-center mb-3 sm:mb-4 md:mb-6 lg:mb-8">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
              <Youtube className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-red-500 animate-pulse" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-dancing font-bold text-foreground mb-2">
                Our Channel
              </h2>
              <Youtube className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-red-500 animate-pulse" />
            </div>
            <p className="text-foreground/70 text-sm sm:text-base md:text-lg">Watch our latest performances and behind-the-scenes content</p>
          </div>
        )}
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 sm:w-80">
              <Skeleton className="aspect-video rounded-lg" />
              <div className="mt-2 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <div className="text-center mb-3 sm:mb-4 md:mb-6 lg:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
            <Youtube className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-red-500 animate-pulse" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-dancing font-bold text-foreground mb-2">
              Our Channel
            </h2>
            <Youtube className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-red-500 animate-pulse" />
          </div>
          <p className="text-foreground/70 text-sm sm:text-base md:text-lg">Watch our latest performances and behind-the-scenes content</p>
        </div>
      )}

      <Carousel className="w-full">
        <CarouselContent className="-ml-2 sm:-ml-4">
          {videos.map((video) => (
            <CarouselItem key={video.id} className="pl-2 sm:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
              <Card 
                className="group cursor-pointer overflow-hidden bg-card border-2 border-border hover:border-red-500/50 transition-all duration-300 hover:shadow-xl h-full"
                onClick={() => setSelectedVideo(video)}
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={getVideoThumbnail(video)}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src = `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-red-600 rounded-full p-3 transform transition-transform duration-300 group-hover:scale-110 shadow-xl opacity-80 group-hover:opacity-100">
                      <Play className="h-5 w-5 md:h-6 md:w-6 text-white fill-white" />
                    </div>
                  </div>

                  {/* Duration badge */}
                  {video.duration && (
                    <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
                      {video.duration}
                    </span>
                  )}
                </div>
                
                <CardContent className="p-3">
                  <h3 className="font-semibold text-foreground line-clamp-2 text-sm md:text-base mb-1">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {video.view_count > 0 && (
                      <>
                        <span>{formatViewCount(video.view_count)} views</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{new Date(video.published_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="flex justify-center gap-2 mt-4">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>

      {/* Video Modal */}
      {selectedVideo && (
        <YouTubeVideoModal
          videoId={selectedVideo.video_id}
          title={selectedVideo.title}
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
};
