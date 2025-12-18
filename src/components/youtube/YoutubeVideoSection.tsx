import React, { useState, useEffect } from 'react';
import { Play, Youtube, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const CHANNEL_URL = 'https://www.youtube.com/@SpelmanCollegeGleeClub';
const CHANNEL_INPUT = '@SpelmanCollegeGleeClub';

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail_url: string;
  duration: string;
  view_count: number;
}

export const YoutubeVideoSection: React.FC = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      // First try to get videos from database
      const { data: videosData, error } = await supabase
        .from('youtube_videos')
        .select('id, video_id, title, thumbnail_url, duration, view_count')
        .order('published_at', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error fetching videos:', error);
        setLoading(false);
        return;
      }

      if (videosData && videosData.length > 0) {
        setVideos(videosData);
        setLoading(false);
        return;
      }

      // If no videos in DB, trigger sync
      await syncVideos();
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const syncVideos = async () => {
    try {
      const { error } = await supabase.functions.invoke('sync-youtube-videos', {
        body: { channelInput: CHANNEL_INPUT, maxResults: 12 }
      });

      if (error) {
        console.error('Sync error:', error);
        setLoading(false);
        return;
      }

      // Refetch videos after sync
      const { data: videosData } = await supabase
        .from('youtube_videos')
        .select('id, video_id, title, thumbnail_url, duration, view_count')
        .order('published_at', { ascending: false })
        .limit(6);

      if (videosData) {
        setVideos(videosData);
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count?.toString() || '0';
  };

  if (loading) {
    return (
      <section className="py-6 sm:py-10 md:py-14 lg:py-16">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-destructive" />
            <span className="ml-3 text-muted-foreground">Loading videos...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 sm:py-10 md:py-14 lg:py-16">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-destructive/20">
              <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                Watch Our Performances
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Experience the Spelman College Glee Club
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => window.open(CHANNEL_URL, '_blank')}
          >
            <Youtube className="h-4 w-4 mr-2" />
            Subscribe
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </div>

        {/* Video Grid */}
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="rounded-xl overflow-hidden bg-card/30 backdrop-blur-sm border border-border/30 shadow-lg"
              >
                {playingVideo === video.video_id ? (
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1&rel=0`}
                      title={video.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div
                    className="aspect-video relative cursor-pointer group"
                    onClick={() => setPlayingVideo(video.video_id)}
                  >
                    <img
                      src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-destructive flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="h-6 w-6 sm:h-7 sm:w-7 text-white fill-white ml-1" />
                      </div>
                    </div>
                    {video.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </span>
                    )}
                  </div>
                )}
                <div className="p-3 sm:p-4">
                  <h3 className="font-medium text-sm sm:text-base text-foreground line-clamp-2">
                    {video.title}
                  </h3>
                  {video.view_count > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatViewCount(video.view_count)} views
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12 space-y-6">
            <div className="bg-destructive/10 rounded-full p-6 w-fit mx-auto">
              <Youtube className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mx-auto" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground">Watch Our Performances</h3>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                Visit our YouTube channel to watch our latest performances.
              </p>
            </div>
            <Button 
              size="lg" 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => window.open(CHANNEL_URL, '_blank')}
            >
              <Youtube className="h-5 w-5 mr-2" />
              Visit Our Channel
            </Button>
          </div>
        )}

        {/* View All Button */}
        {videos.length > 0 && (
          <div className="text-center mt-6 sm:mt-8">
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => window.open(CHANNEL_URL, '_blank')}
            >
              View All Videos
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default YoutubeVideoSection;
