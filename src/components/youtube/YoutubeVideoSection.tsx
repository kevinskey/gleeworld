import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Youtube, Play, ExternalLink } from "lucide-react";

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail_url: string;
  video_url: string;
  view_count: number;
  published_at: string;
}

interface YouTubeChannel {
  id: string;
  channel_url: string;
  channel_name: string;
  featured_video_count: number;
}

export const YoutubeVideoSection = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadYouTubeData();
  }, []);

  const loadYouTubeData = async () => {
    try {
      // Load channel info
      const { data: channelData, error: channelError } = await supabase
        .from('youtube_channels')
        .select('id, channel_url, channel_name, featured_video_count')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (channelData && !channelError) {
        setChannel(channelData);

        // Load featured videos
        const { data: videosData, error: videosError } = await supabase
          .from('youtube_videos')
          .select('*')
          .eq('channel_id', channelData.id)
          .eq('is_featured', true)
          .order('published_at', { ascending: false })
          .limit(channelData.featured_video_count || 6);

        if (videosData && !videosError) {
          setVideos(videosData);
        }
      }
    } catch (error) {
      console.error('Error loading YouTube data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Featured Video Skeleton */}
        <Card className="overflow-hidden bg-white/20 backdrop-blur-md border border-white/30 shadow-xl animate-pulse">
          <div className="aspect-video bg-gray-200/50"></div>
        </Card>
        
        {/* Video Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="bg-white/20 backdrop-blur-md border border-white/30 animate-pulse">
              <div className="aspect-video bg-gray-200/50"></div>
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-gray-200/50 rounded"></div>
                <div className="h-3 bg-gray-200/50 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!videos.length) {
    return (
      <div className="text-center py-12">
        <Youtube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No videos available</h3>
        <p className="text-gray-600 mb-4">
          {channel ? 
            "No featured videos have been set up yet." :
            "YouTube channel hasn't been configured yet."
          }
        </p>
        {channel && (
          <Button asChild className="bg-red-500 hover:bg-red-600 text-white">
            <a href={channel.channel_url} target="_blank" rel="noopener noreferrer">
              <Youtube className="h-4 w-4 mr-2" />
              Visit Our Channel
            </a>
          </Button>
        )}
      </div>
    );
  }

  const featuredVideo = videos[0];
  const otherVideos = videos.slice(1, 4); // Show up to 3 additional videos

  return (
    <div className="space-y-8">
      {/* Featured Video */}
      {featuredVideo && (
        <Card className="overflow-hidden bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
          <div className="aspect-video bg-gradient-to-br from-red-100/50 to-pink-100/50 flex items-center justify-center relative group cursor-pointer hover:bg-red-100/70 transition-colors duration-300">
            <img 
              src={featuredVideo.thumbnail_url}
              alt={featuredVideo.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
              <div className="text-center">
                <div className="bg-red-500/90 backdrop-blur-md rounded-full p-6 mb-4 group-hover:bg-red-600 transition-colors duration-300">
                  <Play className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-2 line-clamp-2 max-w-2xl">
                  {featuredVideo.title}
                </h3>
                <p className="text-white/90 text-lg">{formatViewCount(featuredVideo.view_count)} views</p>
              </div>
            </div>
            <div className="absolute top-4 right-4 bg-black/70 text-white text-sm px-3 py-1 rounded">
              {featuredVideo.duration}
            </div>
            <a 
              href={featuredVideo.video_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="absolute inset-0"
            />
          </div>
        </Card>
      )}

      {/* Additional Videos Grid */}
      {otherVideos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherVideos.map((video) => (
            <Card key={video.id} className="hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 group cursor-pointer">
              <div className="aspect-video bg-gradient-to-br from-red-100/50 to-pink-100/50 flex items-center justify-center relative overflow-hidden">
                <img 
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                  <div className="bg-red-500/80 backdrop-blur-md rounded-full p-4 group-hover:bg-red-600 transition-colors duration-300 opacity-0 group-hover:opacity-100">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                </div>
                <a 
                  href={video.video_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute inset-0"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{video.title}</h3>
                <p className="text-sm text-gray-600">{formatViewCount(video.view_count)} views</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Call to Action */}
      <div className="text-center">
        <Button 
          size="lg" 
          className="bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all duration-300 hover:scale-105"
          asChild
        >
          <a 
            href={channel?.channel_url || "https://youtube.com/@spelmangleeclub"} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            <Youtube className="h-5 w-5" />
            Visit Our Channel
          </a>
        </Button>
      </div>
    </div>
  );
};