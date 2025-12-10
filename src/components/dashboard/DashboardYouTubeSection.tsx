import React, { useState, useEffect } from 'react';
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
  const [expandedVideo, setExpandedVideo] = useState<'left' | 'right' | null>(null);
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
      // Start muted to allow autoplay on mobile
      rel: '0',
      modestbranding: '1',
      controls: '1',
      playsinline: '1',
      enablejsapi: '1',
      origin: window.location.origin,
      fs: '1' // Enable fullscreen
    });
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
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
  const handlePlay = (position: 'left' | 'right') => {
    setVideoKey(prev => prev + 1);
    setExpandedVideo(position);
  };
  const handleClose = () => {
    setVideoKey(prev => prev + 1); // Force remount to stop playback
    setExpandedVideo(null);
  };
  const leftVideo = videos.find(v => v.position === 'left');
  const rightVideo = videos.find(v => v.position === 'right');
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
  const expandedVideoData = expandedVideo === 'left' ? leftVideo : expandedVideo === 'right' ? rightVideo : null;

  // Render video player based on type
  const renderVideoPlayer = (video: DashboardVideo) => {
    if (video.video_type === 'uploaded' && video.video_url) {
      return <video key={`video-${videoKey}`} src={video.video_url} title={video.title || 'Video'} className="absolute inset-0 w-full h-full" controls autoPlay playsInline />;
    }
    return <iframe key={`iframe-${videoKey}`} src={getEmbedUrl(video.video_id)} title={video.title || 'Video'} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
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
              
              {/* Mute indicator for YouTube videos - positioned inside video container */}
              {isYouTube && (
                <div className="absolute bottom-3 left-3 z-30 bg-black/70 backdrop-blur-sm rounded-full p-2 shadow-lg pointer-events-none">
                  <VolumeX className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>;
  }

  // Two-column thumbnail view
  const VideoThumbnail = ({
    video,
    position
  }: {
    video: DashboardVideo | undefined;
    position: 'left' | 'right';
  }) => {
    if (!video) {
      return <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm bg-muted/50">
          No video configured
        </div>;
    }
    const isUploaded = video.video_type === 'uploaded' && video.video_url;
    const thumbnailUrl = getThumbnailUrl(video, 'hq');
    return <button onClick={() => handlePlay(position)} className="absolute inset-0 w-full h-full group cursor-pointer" aria-label={`Play ${video.title || 'video'}`}>
        {/* Thumbnail Image or Video Preview */}
        {isUploaded ? <video src={video.video_url!} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata" /> : <img src={thumbnailUrl} alt={video.title || 'Video thumbnail'} className="absolute inset-0 w-full h-full object-cover" />}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-foreground/10 group-hover:bg-foreground/30 transition-colors duration-300 opacity-100 px-0" />
        
        {/* Title - Bottom Left */}
        {video.title && <div className="absolute bottom-0 left-0 right-8 sm:right-12 bg-gradient-to-t from-foreground/80 via-foreground/40 to-transparent p-1.5 sm:p-2 z-10">
            <h3 className="text-background sm:text-[10px] font-medium truncate text-left text-xs">
              {video.title}
            </h3>
          </div>}
        
        {/* Play Button - Bottom Right, Small */}
        <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 z-10 flex items-center gap-1.5">
          {/* Mute indicator for YouTube */}
          {!isUploaded && (
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-background/80 rounded-full flex items-center justify-center shadow-sm">
              <VolumeX className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
            </div>
          )}
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-background/90 rounded-full flex items-center justify-center group-hover:bg-background group-hover:scale-110 transition-all duration-300 shadow-md">
            <Play className="w-3 h-3 sm:w-4 sm:h-4 text-primary ml-0.5" fill="currentColor" />
          </div>
        </div>
      </button>;
  };
  return <div className="w-full">
      <div className="relative p-3 sm:p-4 bg-card/50 backdrop-blur-sm px-0 py-0 border-primary border-2 border-none rounded-none shadow opacity-100">
        <div className="absolute inset-1 rounded-lg border border-destructive/30 pointer-events-none" />
        
        <div className="relative grid grid-cols-2 gap-2 sm:gap-4">
          {/* Left Video */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
            <VideoThumbnail video={leftVideo} position="left" />
          </div>

          {/* Right Video */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
            <VideoThumbnail video={rightVideo} position="right" />
          </div>
        </div>
      </div>
    </div>;
};