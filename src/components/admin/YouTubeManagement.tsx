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
  RefreshCw,
  ExternalLink
} from "lucide-react";

interface YouTubeVideo {
  id: string;
  youtube_id: string;
  title: string;
  description: string;
  duration?: number;
  thumbnail_url: string;
  view_count?: number;
  category?: string;
  tags?: string[];
  is_featured?: boolean;
  published_at?: string;
  added_by?: string;
  created_at?: string;
}


export const YouTubeManagement = () => {
  const { toast } = useToast();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [manualVideo, setManualVideo] = useState({
    youtube_id: '',
    title: '',
    description: '',
    category: '',
    tags: '',
  });

  // Load existing videos
  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    try {
      // Load videos
      const { data: videosData, error: videosError } = await supabase
        .from('gw_youtube_videos')
        .select('*')
        .order('published_at', { ascending: false });

      if (videosData && !videosError) {
        setVideos(videosData);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleToggleFeatured = async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    try {
      const { error } = await supabase
        .from('gw_youtube_videos')
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
        .from('gw_youtube_videos')
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

  const handleManualUpload = async () => {
    if (!manualVideo.youtube_id || !manualVideo.title) {
      toast({
        title: "Missing Information",
        description: "YouTube ID and title are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Extract video ID from URL if provided
      let videoId = manualVideo.youtube_id;
      const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
      const match = manualVideo.youtube_id.match(youtubeRegex);
      if (match) {
        videoId = match[1];
      }

      // Create video data
      const videoData = {
        youtube_id: videoId,
        title: manualVideo.title,
        description: manualVideo.description || '',
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
        category: manualVideo.category || 'General',
        tags: manualVideo.tags ? manualVideo.tags.split(',').map(tag => tag.trim()) : [],
        is_featured: false,
        view_count: 0,
        published_at: new Date().toISOString(),
        added_by: 'manual'
      };

      const { error } = await supabase
        .from('gw_youtube_videos')
        .insert([videoData]);

      if (error) throw error;

      toast({
        title: "Video Added",
        description: "Video has been added successfully.",
      });

      // Reset form and reload data
      setManualVideo({
        youtube_id: '',
        title: '',
        description: '',
        category: '',
        tags: '',
      });
      setShowManualUpload(false);
      await loadVideos();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to add video.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Youtube className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">YouTube Management</h1>
            <p className="text-gray-600">Manage your YouTube video collection</p>
          </div>
        </div>
      </div>

      {/* Manual Video Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Manual Video Upload
            </div>
            <Button
              onClick={() => setShowManualUpload(!showManualUpload)}
              variant="outline"
              size="sm"
            >
              {showManualUpload ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        {showManualUpload && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="youtube_url">YouTube Video URL or ID</Label>
                <Input
                  id="youtube_url"
                  value={manualVideo.youtube_id}
                  onChange={(e) => setManualVideo(prev => ({ ...prev, youtube_id: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=... or video ID"
                />
              </div>
              <div>
                <Label htmlFor="video_title">Title *</Label>
                <Input
                  id="video_title"
                  value={manualVideo.title}
                  onChange={(e) => setManualVideo(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Video title"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="video_description">Description</Label>
              <Textarea
                id="video_description"
                value={manualVideo.description}
                onChange={(e) => setManualVideo(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Video description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="video_category">Category</Label>
                <Input
                  id="video_category"
                  value={manualVideo.category}
                  onChange={(e) => setManualVideo(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Performance, Behind the Scenes, etc."
                />
              </div>
              <div>
                <Label htmlFor="video_tags">Tags (comma separated)</Label>
                <Input
                  id="video_tags"
                  value={manualVideo.tags}
                  onChange={(e) => setManualVideo(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="music, performance, glee"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowManualUpload(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleManualUpload}
                disabled={!manualVideo.youtube_id || !manualVideo.title}
              >
                <Save className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </div>
          </CardContent>
        )}
      </Card>


      {/* Video Collection */}
      {videos.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Play className="h-5 w-5 mr-2" />
                Video Collection ({videos.length} videos)
              </CardTitle>
              <Button onClick={loadVideos} variant="outline" size="sm">
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
                           {video.duration && (
                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {video.duration}
                            </div>
                          )}
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
                            <span>{video.view_count ? formatViewCount(video.view_count) : '0'} views</span>
                            <span>{video.published_at ? formatDate(video.published_at) : formatDate(video.created_at || '')}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            asChild
                          >
                            <a href={`https://www.youtube.com/watch?v=${video.youtube_id}`} target="_blank" rel="noopener noreferrer">
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
              Add your first video using the manual upload feature above.
            </p>
            <Button onClick={() => setShowManualUpload(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};