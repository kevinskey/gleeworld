import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Play, X, VolumeX, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardVideo {
  id: string;
  position: 'left' | 'right';
  video_id: string;
  video_url: string | null;
  video_type: 'youtube' | 'uploaded';
  title: string | null;
  is_active: boolean;
  autoplay: boolean;
  muted: boolean;
}

export const DashboardYouTubeSection = () => {
  const [videos, setVideos] = useState<DashboardVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null); // video ID
  const [isMuted, setIsMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchVideos();
  }, []);
  const fetchVideos = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('dashboard_youtube_videos').select('*').eq('is_active', true).order('position');
      if (error) throw error;
      const typedData = (data || []).map(v => ({
        ...v,
        position: v.position as 'left' | 'right',
        video_type: (v.video_type || 'youtube') as 'youtube' | 'uploaded',
        video_url: v.video_url || null
      }));
      setVideos(typedData);
    } catch (error) {
      console.error('Error fetching dashboard videos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract video ID from various YouTube URL formats or return as-is if already an ID
  const extractVideoId = (input: string): string => {
    if (!input) return '';

    // Already a plain video ID (11 chars)
    if (/^[\w-]{11}$/.test(input)) return input;

    // youtube.com/live/VIDEO_ID format
    const liveMatch = input.match(/youtube\.com\/live\/([^?&]+)/);
    if (liveMatch) return liveMatch[1];

    // youtu.be/VIDEO_ID format
    const shortMatch = input.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return shortMatch[1];

    // youtube.com/watch?v=VIDEO_ID format
    const watchMatch = input.match(/[?&]v=([^&]+)/);
    if (watchMatch) return watchMatch[1];

    // youtube.com/embed/VIDEO_ID format
    const embedMatch = input.match(/embed\/([^?&]+)/);
    if (embedMatch) return embedMatch[1];
    return input;
  };
  const getEmbedUrl = (videoId: string) => {
    const id = extractVideoId(videoId);
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      rel: '0',           // Don't show related videos
      modestbranding: '1', // Minimal YouTube branding
      controls: '1',
      playsinline: '1',
      enablejsapi: '1',
      origin: window.location.origin,
      fs: '1',
      disablekb: '0',
      iv_load_policy: '3', // Hide annotations
      cc_load_policy: '0', // Don't show captions by default
    });
    // Use youtube-nocookie for privacy and cleaner embed
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
  };
  const getThumbnailUrl = (video: DashboardVideo, quality: 'maxres' | 'sd' | 'hq' | 'mq' = 'hq') => {
    // For uploaded videos, we can't generate a thumbnail, so use a placeholder or first frame
    if (video.video_type === 'uploaded' && video.video_url) {
      // Return empty string - we'll show the video element instead
      return '';
    }
    const id = extractVideoId(video.video_id);
    const qualityMap = {
      maxres: 'maxresdefault',
      sd: 'sddefault',
      hq: 'hqdefault',
      mq: 'mqdefault'
    };
    return `https://img.youtube.com/vi/${id}/${qualityMap[quality]}.jpg`;
  };
  const [videoKey, setVideoKey] = useState(0);
  
  const handlePlay = (videoId: string) => {
    setVideoKey(prev => prev + 1);
    setIsMuted(true); // Reset muted state when playing new video
    setExpandedVideo(videoId);
  };
  
  const handleClose = () => {
    setVideoKey(prev => prev + 1); // Force remount to stop playback
    setExpandedVideo(null);
    setIsMuted(true); // Reset muted state
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Control YouTube iframe via postMessage
    if (iframeRef.current) {
      const command = newMutedState ? 'mute' : 'unMute';
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: command }),
        '*'
      );
    }
    
    // Control HTML5 video element
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }
  };
  
  if (!loading && videos.length === 0) {
    return null;
  }
  
  if (loading) {
    return <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="aspect-video bg-muted animate-pulse rounded-xl border border-border" />
          <div className="aspect-video bg-muted animate-pulse rounded-xl border border-border" />
        </div>
      </div>;
  }
  
  const expandedVideoData = expandedVideo ? videos.find(v => v.id === expandedVideo) : null;

  // Render video player based on type
  const renderVideoPlayer = (video: DashboardVideo) => {
    if (video.video_type === 'uploaded' && video.video_url) {
      return (
        <video 
          ref={videoRef}
          key={`video-${videoKey}`} 
          src={video.video_url} 
          title={video.title || 'Video'} 
          className="absolute inset-0 w-full h-full" 
          controls 
          autoPlay 
          playsInline
          muted={isMuted}
        />
      );
    }
    return (
      <iframe 
        ref={iframeRef}
        key={`iframe-${videoKey}`} 
        src={getEmbedUrl(video.video_id)} 
        title={video.title || 'Video'} 
        className="absolute inset-0 w-full h-full" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowFullScreen 
      />
    );
  };

  // Expanded full-width view
  if (expandedVideo && expandedVideoData) {
    const isYouTube = expandedVideoData.video_type !== 'uploaded';
    
    return <div className="w-full">
        <div className="relative rounded-xl border-2 border-destructive/60 p-3 sm:p-4 bg-card/50 backdrop-blur-sm shadow-sm">
          <div className="absolute inset-1 rounded-lg border border-destructive/30 pointer-events-none" />
          
          <div className="relative">
            {/* Close button */}
            <Button variant="secondary" size="icon" onClick={handleClose} className="absolute top-2 right-2 z-20 bg-background/90 hover:bg-background shadow-lg" aria-label="Close video">
              <X className="h-5 w-5" />
            </Button>

            {/* Title overlay */}
            {expandedVideoData.title && <div className="absolute top-12 left-0 right-12 bg-gradient-to-b from-background/95 via-background/60 to-transparent p-3 sm:p-4 z-10 backdrop-blur-sm rounded-t-lg">
                <h3 className="text-foreground text-sm sm:text-base md:text-lg font-semibold truncate">
                  {expandedVideoData.title}
                </h3>
              </div>}

            {/* Full-width video player */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-card shadow-md">
              {renderVideoPlayer(expandedVideoData)}
              
              {/* Mute toggle button - works for both YouTube and uploaded videos */}
              <button
                onClick={toggleMute}
                className="absolute top-3 left-3 z-30 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-full p-2 shadow-lg transition-colors cursor-pointer"
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5 text-white" />
                ) : (
                  <Volume2 className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>;
  }

  // Video thumbnail component for carousel
  const VideoThumbnail = ({
    video,
    index
  }: {
    video: DashboardVideo;
    index: number;
  }) => {
    const isUploaded = video.video_type === 'uploaded' && video.video_url;
    const thumbnailUrl = getThumbnailUrl(video, 'hq');
    
    const handleClick = () => {
      handlePlay(video.id);
    };
    
    return (
      <button 
        onClick={handleClick} 
        className="relative w-full aspect-video group cursor-pointer flex-shrink-0" 
        aria-label={`Play ${video.title || 'video'}`}
      >
        {/* Thumbnail Image or Video Preview */}
        {isUploaded ? (
          <video 
            src={video.video_url!} 
            className="absolute inset-0 w-full h-full object-cover rounded-lg" 
            muted 
            playsInline 
            preload="metadata" 
          />
        ) : (
          <img 
            src={thumbnailUrl} 
            alt={video.title || 'Video thumbnail'} 
            className="absolute inset-0 w-full h-full object-cover rounded-lg" 
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-foreground/10 group-hover:bg-foreground/30 transition-colors duration-300 rounded-lg" />
        
        {/* Title - Bottom Left */}
        {video.title && (
          <div className="absolute bottom-0 left-0 right-12 bg-gradient-to-t from-foreground/80 via-foreground/40 to-transparent p-2 sm:p-3 z-10 rounded-b-lg">
            <h3 className="text-background text-xs sm:text-sm font-medium truncate text-left">
              {video.title}
            </h3>
          </div>
        )}
        
        {/* Play Button - Center */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-background/90 rounded-full flex items-center justify-center group-hover:bg-background group-hover:scale-110 transition-all duration-300 shadow-lg">
            <Play className="w-5 h-5 sm:w-6 sm:h-6 text-primary ml-1" fill="currentColor" />
          </div>
        </div>
        
        {/* Mute indicator - Bottom Right */}
        {!isUploaded && (
          <div className="absolute bottom-2 right-2 z-10 w-6 h-6 bg-background/80 rounded-full flex items-center justify-center shadow-sm">
            <VolumeX className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </button>
    );
  };

  // Filter to only active videos and sort them
  const activeVideos = videos.filter(v => v.is_active);

  return (
    <div className="w-full">
      <div className="relative p-3 sm:p-4 bg-card/50 backdrop-blur-sm border border-border rounded-xl shadow-sm">
        
        {/* Header */}
        <div className="relative mb-3 sm:mb-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" fill="currentColor" />
            Featured Videos
          </h2>
          {activeVideos.length > 1 && (
            <span className="text-xs text-muted-foreground">
              Swipe to browse
            </span>
          )}
        </div>
        
        {/* Horizontal Scroll Carousel */}
        <div className="relative -mx-3 sm:-mx-4 px-3 sm:px-4">
          <div 
            className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {activeVideos.map((video, index) => (
              <div 
                key={video.id} 
                className="flex-shrink-0 w-[85%] sm:w-[70%] md:w-[48%] lg:w-[48%] snap-center"
              >
                <VideoThumbnail video={video} index={index} />
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicators (dots) */}
        {activeVideos.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {activeVideos.map((video, index) => (
              <div 
                key={video.id}
                className="w-2 h-2 rounded-full bg-muted-foreground/30"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};