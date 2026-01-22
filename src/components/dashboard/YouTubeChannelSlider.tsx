import React, { useState, useMemo } from 'react';
import { Youtube, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

interface YouTubeVideo {
  id: string;
  title: string;
  video_id: string;
  thumbnail_url: string | null;
  description: string | null;
  display_order: number;
}

export const YouTubeChannelSlider: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const { data: videos, isLoading } = useQuery({
    queryKey: ['youtube-channel-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('youtube_channel_videos')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as YouTubeVideo[];
    }
  });

  // Duplicate videos for seamless infinite scroll
  const duplicatedVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    // Triple the videos for smoother infinite effect
    return [...videos, ...videos, ...videos];
  }, [videos]);

  const getThumbnail = (video: YouTubeVideo) => {
    return video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`;
  };

  const handleVideoClick = (video: YouTubeVideo) => {
    setSelectedVideo(video);
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
  };

  // Calculate animation duration based on number of videos
  const animationDuration = videos ? Math.max(videos.length * 8, 24) : 24;

  return (
    <div className="w-full">
      {/* Header */}
      <div
        style={{ fontFamily: "'Cinzel', serif" }}
        className="w-full h-12 gap-2 text-sm sm:text-xl bg-gradient-to-b from-[hsl(208,100%,20%)] via-[hsl(208,100%,17%)] to-[hsl(208,100%,14%)] text-primary-foreground flex items-center justify-start text-left px-3 sm:px-6 lg:px-8 shadow-lg border-t border-t-white/20"
      >
        <Youtube className="h-4 w-4 sm:h-5 sm:w-5" />
        YouTube Channel
      </div>

      {/* Video Slider with Infinite Scroll */}
      <div 
        className="bg-gradient-to-b from-[hsl(208,100%,14%)] to-[hsl(208,100%,10%)] py-5 overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {isLoading ? (
          <div className="flex gap-4 px-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-72 sm:w-80 lg:w-96 aspect-video bg-white/10 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : videos && videos.length > 0 ? (
          <div 
            className="flex gap-4 pl-5"
            style={{
              animation: `scrollInfinite ${animationDuration}s linear infinite`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {duplicatedVideos.map((video, index) => (
              <button
                key={`${video.id}-${index}`}
                onClick={() => handleVideoClick(video)}
                className="flex-shrink-0 group text-left"
              >
                <div className="relative w-72 sm:w-80 lg:w-96 aspect-video rounded-lg overflow-hidden border-2 border-white/10 hover:border-primary transition-all shadow-lg">
                  <img
                    src={getThumbnail(video)}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                      <svg className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-white/80 font-medium truncate max-w-72 sm:max-w-80 lg:max-w-96">
                  {video.title}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-white/60 text-sm py-4 px-5">No videos added yet</div>
        )}
      </div>

      {/* Infinite scroll keyframes */}
      <style>{`
        @keyframes scrollInfinite {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.33%);
          }
        }
      `}</style>

      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-black border-none overflow-hidden">
          <DialogTitle className="sr-only">
            {selectedVideo?.title || 'Video Player'}
          </DialogTitle>
          <div className="relative">
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute -top-10 right-0 z-50 p-2 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Video embed */}
            {selectedVideo && (
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.video_id}?autoplay=1&rel=0`}
                  title={selectedVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            
            {/* Video title */}
            {selectedVideo && (
              <div className="p-4 bg-gradient-to-t from-black to-transparent">
                <h3 className="text-white font-medium text-lg">{selectedVideo.title}</h3>
                {selectedVideo.description && (
                  <p className="text-white/70 text-sm mt-1 line-clamp-2">{selectedVideo.description}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default YouTubeChannelSlider;
