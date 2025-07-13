import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Youtube, 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  X,
  ArrowLeft,
  ArrowRight,
  Settings,
  ExternalLink,
  RefreshCw,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail_url: string;
  video_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  category: string;
  tags: string[];
  is_featured: boolean;
  display_order: number;
  published_at: string;
}

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_description: string;
  channel_url: string;
  channel_handle: string;
  thumbnail_url: string;
  subscriber_count: number;
  video_count: number;
  last_synced_at: string;
  auto_sync: boolean;
  featured_video_count: number;
}

export const YouTubeManagement = () => {
  const { toast } = useToast();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [channelInput, setChannelInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Load existing channel and videos
  useEffect(() => {
    loadChannelData();
  }, []);

  const loadChannelData = async () => {
    setLoading(true);
    try {
      // Load channel
      const { data: channelData, error: channelError } = await supabase
        .from('youtube_channels')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (channelData && !channelError) {
        setChannel(channelData);
        setChannelInput(channelData.channel_url);

        // Load videos for this channel
        const { data: videosData, error: videosError } = await supabase
          .from('youtube_videos')
          .select('*')
          .eq('channel_id', channelData.id)
          .order('published_at', { ascending: false });

        if (videosData && !videosError) {
          setVideos(videosData);
        }
      }
    } catch (error) {
      console.error('Error loading channel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncChannel = async () => {
    if (!channelInput.trim()) {
      toast({
        title: "Channel URL Required",
        description: "Please enter a YouTube channel URL or handle.",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-youtube-videos', {
        body: {
          channelInput: channelInput.trim(),
          maxResults: 50
        }
      });

      if (error) {
        console.error('Sync error:', error);
        throw error;
      }

      if (data && data.success) {
        toast({
          title: "Sync Successful",
          description: data.message,
        });
        
        // Reload data
        await loadChannelData();
      } else {
        const errorMessage = data?.error || data?.message || "Sync failed";
        if (errorMessage.includes('YouTube API key')) {
          throw new Error("YouTube API key not configured. Please contact your system administrator to configure the YOUTUBE_API_KEY environment variable in Supabase.");
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync YouTube channel. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleFeatured = async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    try {
      const { error } = await supabase
        .from('youtube_videos')
        .update({ is_featured: !video.is_featured })
        .eq('id', videoId);

      if (error) throw error;

      setVideos(videos.map(v => 
        v.id === videoId ? { ...v, is_featured: !v.is_featured } : v
      ));

      toast({
        title: "Video Updated",
        description: `Video ${video.is_featured ? 'removed from' : 'added to'} featured list.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update video status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('youtube_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      setVideos(videos.filter(v => v.id !== videoId));
      toast({
        title: "Video Removed",
        description: "Video has been removed from the collection.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete video.",
        variant: "destructive",
      });
    }
  };

  const updateChannelSettings = async (updates: Partial<YouTubeChannel>) => {
    if (!channel) return;

    try {
      const { error } = await supabase
        .from('youtube_channels')
        .update(updates)
        .eq('id', channel.id);

      if (error) throw error;

      setChannel({ ...channel, ...updates });
      toast({
        title: "Settings Updated",
        description: "Channel settings have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    }
  };

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % Math.ceil(videos.length / 3));
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + Math.ceil(videos.length / 3)) % Math.ceil(videos.length / 3));
  };

  const getVisibleVideos = () => {
    const startIndex = activeSlide * 3;
    return videos.slice(startIndex, startIndex + 3);
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Youtube className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">YouTube Management</h1>
            <p className="text-gray-600">Sync and manage your YouTube channel content</p>
          </div>
        </div>
        {channel && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Last synced: {channel.last_synced_at ? formatDate(channel.last_synced_at) : 'Never'}</span>
          </div>
        )}
      </div>

      {/* Channel Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Channel Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!channel && (
            <div className="text-center py-6 bg-blue-50 rounded-lg border border-blue-200">
              <Youtube className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your YouTube Channel</h3>
              <p className="text-gray-600 mb-4">Enter your YouTube channel URL or handle to automatically import all your videos</p>
            </div>
          )}
          
          <div className="flex space-x-2">
            <div className="flex-1">
              <Label htmlFor="channel_input">YouTube Channel URL or Handle</Label>
              <Input
                id="channel_input"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="@spelmangleeclub, https://youtube.com/@spelmangleeclub, or UC1234..."
                className="mt-1"
              />
              <div className="text-xs text-gray-500 mt-1">
                <p>Supports: @handle, channel URL, or channel ID (UC...)</p>
                <p className="text-red-600 mt-1">
                  ⚠️ <strong>API Quota Exceeded</strong> - Quota is at project level, not API key level
                </p>
                <p className="text-blue-600 mt-1">
                  💡 Solutions: Create new Google Cloud project for fresh quota, or{" "}
                  <button 
                    onClick={() => setChannelInput("MOCK_DATA")} 
                    className="underline hover:text-blue-800"
                  >
                    use mock data
                  </button> for testing
                </p>
              </div>
            </div>
            <div className="pt-6">
              <Button 
                onClick={handleSyncChannel} 
                disabled={syncing || !channelInput.trim()}
                className="bg-red-500 hover:bg-red-600"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Channel
                  </>
                )}
              </Button>
            </div>
          </div>

          {channel && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3">
                <img 
                  src={channel.thumbnail_url} 
                  alt={channel.channel_name}
                  className="h-12 w-12 rounded-full"
                />
                <div>
                  <h4 className="font-medium">{channel.channel_name}</h4>
                  <p className="text-sm text-gray-600">{channel.channel_handle}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{channel.subscriber_count.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Subscribers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{videos.length}</p>
                <p className="text-sm text-gray-600">Videos Synced</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel Settings */}
      {channel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Display Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="featured_count">Featured Videos Count</Label>
                <Input
                  id="featured_count"
                  type="number"
                  value={channel.featured_video_count}
                  onChange={(e) => updateChannelSettings({ featured_video_count: parseInt(e.target.value) || 6 })}
                  min="1"
                  max="12"
                />
                <p className="text-xs text-gray-500">Number of videos to display on landing page</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="auto_sync">Auto Sync</Label>
                <div className="flex items-center space-x-2">
                  <input
                    id="auto_sync"
                    type="checkbox"
                    checked={channel.auto_sync}
                    onChange={(e) => updateChannelSettings({ auto_sync: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Automatically sync new videos daily</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Collection */}
      {videos.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Play className="h-5 w-5 mr-2" />
                Video Collection ({videos.length} videos)
              </CardTitle>
              <Button onClick={handleSyncChannel} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Video Slider */}
            <div className="relative">
              {videos.length > 3 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md"
                    onClick={prevSlide}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md"
                    onClick={nextSlide}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              <div className="overflow-hidden px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getVisibleVideos().map((video) => (
                    <Card key={video.id} className="group hover:shadow-lg transition-shadow">
                      <div className="relative">
                        <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <div className="bg-red-500 rounded-full p-3 group-hover:scale-110 transition-transform">
                              <Play className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {video.duration}
                          </div>
                          {video.is_featured && (
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-yellow-500 text-black">Featured</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold line-clamp-2 text-sm">{video.title}</h3>
                            <div className="flex space-x-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleToggleFeatured(video.id)}
                                title="Toggle featured status"
                              >
                                <Youtube className={`h-4 w-4 ${video.is_featured ? 'text-red-500' : 'text-gray-400'}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDeleteVideo(video.id)}
                                title="Remove video"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{video.description}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{formatViewCount(video.view_count)} views</span>
                            <span>{formatDate(video.published_at)}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            asChild
                          >
                            <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-2" />
                              View on YouTube
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Slide Indicators */}
              {videos.length > 3 && (
                <div className="flex justify-center mt-4 space-x-2">
                  {Array.from({ length: Math.ceil(videos.length / 3) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveSlide(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        activeSlide === index ? 'bg-red-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {videos.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Youtube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
            <p className="text-gray-600 mb-4">
              {channel ? 
                "No videos have been synced yet. Try syncing your channel." :
                "Connect your YouTube channel to automatically import all your videos."
              }
            </p>
            <Button onClick={handleSyncChannel} disabled={!channelInput.trim()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {channel ? 'Sync Videos' : 'Connect Channel'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};