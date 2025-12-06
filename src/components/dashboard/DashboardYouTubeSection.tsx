import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      // Cast data to correct type
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
      autoplay: autoplay ? '1' : '0',
      mute: muted ? '1' : '0',
      rel: '0',
      modestbranding: '1',
      controls: '1'
    });
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  const leftVideo = videos.find(v => v.position === 'left');
  const rightVideo = videos.find(v => v.position === 'right');

  // Don't render if no videos configured
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

  return (
    <div className="w-full px-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Video */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black/10">
          {leftVideo ? (
            <>
              {leftVideo.title && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-3 z-10">
                  <h3 className="text-white text-sm font-medium truncate">{leftVideo.title}</h3>
                </div>
              )}
              <iframe
                src={getEmbedUrl(leftVideo.video_id, leftVideo.autoplay, leftVideo.muted)}
                title={leftVideo.title || 'Left Video'}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              No video configured
            </div>
          )}
        </div>

        {/* Right Video */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black/10">
          {rightVideo ? (
            <>
              {rightVideo.title && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-3 z-10">
                  <h3 className="text-white text-sm font-medium truncate">{rightVideo.title}</h3>
                </div>
              )}
              <iframe
                src={getEmbedUrl(rightVideo.video_id, rightVideo.autoplay, rightVideo.muted)}
                title={rightVideo.title || 'Right Video'}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              No video configured
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
