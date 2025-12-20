import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { Play, Youtube, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FeaturedVideo {
  id: string;
  video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  title_override: string | null;
  description_override: string | null;
  display_order: number;
}

interface FeaturedVideoCarouselProps {
  maxVideos?: number;
  showTitle?: boolean;
  className?: string;
}

export const FeaturedVideoCarousel: React.FC<FeaturedVideoCarouselProps> = ({
  maxVideos = 6,
  showTitle = true,
  className = ''
}) => {
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    fetchFeaturedVideos();
  }, [maxVideos]);

  const fetchFeaturedVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_featured_videos')
        .select(`
          id,
          title_override,
          description_override,
          display_order,
          video_id,
          youtube_videos!inner (
            video_id,
            title,
            description,
            thumbnail_url
          )
        `)
        .eq('is_active', true)
        .or('start_date.is.null,start_date.lte.now()')
        .or('end_date.is.null,end_date.gte.now()')
        .order('display_order', { ascending: true })
        .limit(maxVideos);

      if (error) {
        console.error('Error fetching featured videos:', error);
        // Fallback to regular featured videos from youtube_videos
        const { data: fallbackData } = await supabase
          .from('youtube_videos')
          .select('*')
          .eq('is_featured', true)
          .order('display_order', { ascending: true })
          .limit(maxVideos);
        
        if (fallbackData) {
          setVideos(fallbackData.map(v => ({
            id: v.id,
            video_id: v.video_id,
            title: v.title,
            description: v.description,
            thumbnail_url: v.thumbnail_url,
            title_override: null,
            description_override: null,
            display_order: v.display_order || 0
          })));
        }
      } else if (data) {
        setVideos(data.map((item: any) => ({
          id: item.id,
          video_id: item.youtube_videos.video_id,
          title: item.youtube_videos.title,
          description: item.youtube_videos.description,
          thumbnail_url: item.youtube_videos.thumbnail_url,
          title_override: item.title_override,
          description_override: item.description_override,
          display_order: item.display_order
        })));
      }
    } catch (err) {
      console.error('Error in fetchFeaturedVideos:', err);
    } finally {
      setLoading(false);
    }
  };

  const getVideoEmbedUrl = (videoId: string) => {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  };

  const getVideoThumbnail = (video: FeaturedVideo) => {
    if (video.thumbnail_url) return video.thumbnail_url;
    return `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`;
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showTitle && <Skeleton className="h-10 w-64 mx-auto" />}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null; // Don't render anything if no videos
  }

  return (
    <div className={className}>
      {showTitle && (
        <div className="text-center mb-4 md:mb-6">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
            <Youtube className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-red-500" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-dancing font-bold text-primary-foreground">
              Featured Videos
            </h2>
            <Youtube className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-red-500" />
          </div>
          <p className="text-primary-foreground/70 text-xs sm:text-sm md:text-base font-medium">
            Watch our latest performances and highlights
          </p>
        </div>
      )}

      {/* Video Modal */}
      {activeVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div className="relative w-full max-w-5xl aspect-video">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setActiveVideo(null)}
            >
              ✕
            </Button>
            <iframe
              src={getVideoEmbedUrl(activeVideo)}
              title="YouTube video player"
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Carousel */}
      <Carousel className="w-full">
        <CarouselContent className="-ml-2 md:-ml-4">
          {videos.map((video) => (
            <CarouselItem 
              key={video.id} 
              className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <Card 
                className="group cursor-pointer overflow-hidden bg-primary/80 border border-primary-foreground/30 hover:bg-primary/70 transition-all duration-300 hover:shadow-xl"
                onClick={() => setActiveVideo(video.video_id)}
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={getVideoThumbnail(video)}
                    alt={video.title_override || video.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src = `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors duration-300" />
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-red-600 rounded-full p-3 md:p-4 transform transition-transform duration-300 group-hover:scale-110 shadow-xl">
                      <Play className="h-6 w-6 md:h-8 md:w-8 text-white fill-white" />
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-3 md:p-4">
                  <h3 className="font-semibold text-primary-foreground line-clamp-2 text-sm md:text-base mb-1">
                    {video.title_override || video.title}
                  </h3>
                  {(video.description_override || video.description) && (
                    <p className="text-primary-foreground/70 text-xs md:text-sm line-clamp-2">
                      {video.description_override || video.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-4 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/30" />
        <CarouselNext className="hidden md:flex -right-4 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/30" />
      </Carousel>
    </div>
  );
};

export default FeaturedVideoCarousel;
