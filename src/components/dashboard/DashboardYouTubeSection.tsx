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

  const getEmbedUrl = (videoId: string, autoplay: boolean, muted: boolean) => {
    const params = new URLSearchParams({
      autoplay: '1', // Always autoplay when clicked
      mute: muted ? '1' : '0',
      rel: '0',
      modestbranding: '1',
      controls: '1'
    });
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  const getThumbnailUrl = (videoId: string) => {
    // Use maxresdefault for high quality, fallback handled by img onError
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
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
    const [imgError, setImgError] = useState(false);

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
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-3 z-10">
              <h3 className="text-white text-sm font-medium truncate">{video.title}</h3>
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
          src={imgError 
            ? `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`
            : getThumbnailUrl(video.video_id)
          }
          alt={video.title || 'Video thumbnail'}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
        
        {/* Title */}
        {video.title && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-3 z-10">
            <h3 className="text-white text-sm font-medium truncate text-left">{video.title}</h3>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
