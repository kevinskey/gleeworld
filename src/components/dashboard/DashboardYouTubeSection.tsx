import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Play } from 'lucide-react';

interface DashboardVideo {
  id: string;
  position: 'left' | 'right';
  video_id: string;
  title: string | null;
  is_active: boolean;
  autoplay: boolean;
  muted: boolean;
}

export const DashboardYouTubeSection = () => {
  const [videos, setVideos] = useState<DashboardVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingLeft, setPlayingLeft] = useState(false);
  const [playingRight, setPlayingRight] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_youtube_videos')
        .select('*')
        .eq('is_active', true)
        .order('position');

      if (error) throw error;
      const typedData = (data || []).map(v => ({
        ...v,
        position: v.position as 'left' | 'right'
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
    
    // Already a plain video ID (no slashes or dots)
    if (/^[\w-]{11}$/.test(input)) return input;
    
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

  const getEmbedUrl = (videoId: string, autoplay: boolean, muted: boolean) => {
    const id = extractVideoId(videoId);
    const params = new URLSearchParams({
      autoplay: '1',
      mute: muted ? '1' : '0',
      rel: '0',
      modestbranding: '1',
      controls: '1'
    });
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  };

  const getThumbnailUrl = (videoId: string, quality: 'maxres' | 'sd' | 'hq' | 'mq' = 'hq') => {
    const id = extractVideoId(videoId);
    const qualityMap = {
      maxres: 'maxresdefault',
      sd: 'sddefault', 
      hq: 'hqdefault',
      mq: 'mqdefault'
    };
    return `https://img.youtube.com/vi/${id}/${qualityMap[quality]}.jpg`;
  };

  const leftVideo = videos.find(v => v.position === 'left');
  const rightVideo = videos.find(v => v.position === 'right');

  if (!loading && videos.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="w-full px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="aspect-video bg-muted animate-pulse rounded-lg" />
          <div className="aspect-video bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  const VideoThumbnail = ({ 
    video, 
    isPlaying, 
    onPlay 
  }: { 
    video: DashboardVideo | undefined; 
    isPlaying: boolean; 
    onPlay: () => void;
  }) => {

    if (!video) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          No video configured
        </div>
      );
    }

    if (isPlaying) {
      return (
        <>
          {video.title && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-2 sm:p-3 z-10">
              <h3 
                className="text-white text-xs sm:text-sm font-semibold truncate drop-shadow-md"
                style={{ 
                  textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}
              >
                {video.title}
              </h3>
            </div>
          )}
          <iframe
            src={getEmbedUrl(video.video_id, video.autoplay, video.muted)}
            title={video.title || 'Video'}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </>
      );
    }

    return (
      <button
        onClick={onPlay}
        className="absolute inset-0 w-full h-full group cursor-pointer"
        aria-label={`Play ${video.title || 'video'}`}
      >
        {/* Thumbnail Image */}
        <img
          src={getThumbnailUrl(video.video_id, 'hq')}
          alt={video.title || 'Video thumbnail'}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
        
        {/* Title */}
        {video.title && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-2 sm:p-3 z-10">
            <h3 
              className="text-white text-xs sm:text-sm font-semibold truncate text-left drop-shadow-md"
              style={{ 
                textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
              }}
            >
              {video.title}
            </h3>
          </div>
        )}
        
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-700 group-hover:scale-110 transition-all shadow-lg">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="w-full px-4 py-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {/* Left Video */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          <VideoThumbnail 
            video={leftVideo} 
            isPlaying={playingLeft} 
            onPlay={() => setPlayingLeft(true)} 
          />
        </div>

        {/* Right Video */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          <VideoThumbnail 
            video={rightVideo} 
            isPlaying={playingRight} 
            onPlay={() => setPlayingRight(true)} 
          />
        </div>
      </div>
    </div>
  );
};
