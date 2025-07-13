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
  Edit, 
  Save, 
  X,
  ArrowLeft,
  ArrowRight,
  Settings,
  ExternalLink
} from "lucide-react";

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail_url: string;
  video_url: string;
  views: string;
  category: string;
  is_featured: boolean;
  display_order: number;
}

interface YouTubeSettings {
  channel_url: string;
  channel_name: string;
  channel_description: string;
  auto_sync: boolean;
  featured_video_count: number;
}

export const YouTubeManagement = () => {
  const { toast } = useToast();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [settings, setSettings] = useState<YouTubeSettings>({
    channel_url: "https://youtube.com/@spelmangleeclub",
    channel_name: "Spelman College Glee Club",
    channel_description: "Official YouTube channel of the Spelman College Glee Club",
    auto_sync: false,
    featured_video_count: 6
  });
  const [loading, setLoading] = useState(false);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [newVideo, setNewVideo] = useState({
    title: "",
    description: "",
    duration: "",
    video_url: "",
    views: "",
    category: "Performance"
  });
  const [activeSlide, setActiveSlide] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockVideos: YouTubeVideo[] = [
      {
        id: "1",
        title: "Spring Concert 2024 Highlights",
        description: "Best moments from our spring concert featuring classic spirituals and contemporary pieces.",
        duration: "8:45",
        thumbnail_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
        video_url: "https://youtube.com/watch?v=example1",
        views: "12K",
        category: "Concert",
        is_featured: true,
        display_order: 1
      },
      {
        id: "2",
        title: "Behind the Scenes: Rehearsal Process",
        description: "Take a look at how we prepare for our performances, from warm-ups to final rehearsals.",
        duration: "5:23",
        thumbnail_url: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
        video_url: "https://youtube.com/watch?v=example2",
        views: "8.5K",
        category: "Behind the Scenes",
        is_featured: true,
        display_order: 2
      },
      {
        id: "3",
        title: "Community Outreach Performance",
        description: "Spreading joy through music at local community centers and nursing homes.",
        duration: "12:10",
        thumbnail_url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
        video_url: "https://youtube.com/watch?v=example3",
        views: "15K",
        category: "Outreach",
        is_featured: true,
        display_order: 3
      },
      {
        id: "4",
        title: "Holiday Special 2023",
        description: "Celebrating the season with traditional holiday songs and spiritual arrangements.",
        duration: "15:30",
        thumbnail_url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b",
        video_url: "https://youtube.com/watch?v=example4",
        views: "22K",
        category: "Holiday",
        is_featured: false,
        display_order: 4
      }
    ];
    setVideos(mockVideos);
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Here you would save to your database
      // await supabase.from('youtube_settings').upsert(settings);
      
      toast({
        title: "Settings saved",
        description: "YouTube channel settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = () => {
    if (!newVideo.title || !newVideo.video_url) {
      toast({
        title: "Missing information",
        description: "Please fill in at least the title and video URL.",
        variant: "destructive",
      });
      return;
    }

    const video: YouTubeVideo = {
      id: Date.now().toString(),
      ...newVideo,
      thumbnail_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
      is_featured: false,
      display_order: videos.length + 1
    };

    setVideos([...videos, video]);
    setNewVideo({
      title: "",
      description: "",
      duration: "",
      video_url: "",
      views: "",
      category: "Performance"
    });
    setShowAddForm(false);

    toast({
      title: "Video added",
      description: "New video has been added to the collection.",
    });
  };

  const handleDeleteVideo = (id: string) => {
    setVideos(videos.filter(v => v.id !== id));
    toast({
      title: "Video removed",
      description: "Video has been removed from the collection.",
    });
  };

  const handleToggleFeatured = (id: string) => {
    setVideos(videos.map(v => 
      v.id === id ? { ...v, is_featured: !v.is_featured } : v
    ));
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Youtube className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">YouTube Management</h1>
            <p className="text-gray-600">Manage your YouTube channel settings and video content</p>
          </div>
        </div>
        <Button onClick={handleSaveSettings} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          Save All Changes
        </Button>
      </div>

      {/* Channel Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Channel Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channel_url">Channel URL</Label>
              <Input
                id="channel_url"
                value={settings.channel_url}
                onChange={(e) => setSettings({ ...settings, channel_url: e.target.value })}
                placeholder="https://youtube.com/@yourhandle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel_name">Channel Name</Label>
              <Input
                id="channel_name"
                value={settings.channel_name}
                onChange={(e) => setSettings({ ...settings, channel_name: e.target.value })}
                placeholder="Your Channel Name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel_description">Channel Description</Label>
            <Textarea
              id="channel_description"
              value={settings.channel_description}
              onChange={(e) => setSettings({ ...settings, channel_description: e.target.value })}
              placeholder="Describe your YouTube channel..."
              className="min-h-[80px]"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Featured Videos Count</h4>
              <p className="text-sm text-gray-600">Number of videos to display on landing page</p>
            </div>
            <Input
              type="number"
              value={settings.featured_video_count}
              onChange={(e) => setSettings({ ...settings, featured_video_count: parseInt(e.target.value) || 6 })}
              className="w-20"
              min="1"
              max="12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Video Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Play className="h-5 w-5 mr-2" />
              Video Collection
            </CardTitle>
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Video Form */}
          {showAddForm && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Add New Video</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="video_title">Video Title</Label>
                    <Input
                      id="video_title"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                      placeholder="Enter video title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="video_url">YouTube URL</Label>
                    <Input
                      id="video_url"
                      value={newVideo.video_url}
                      onChange={(e) => setNewVideo({ ...newVideo, video_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="video_duration">Duration</Label>
                    <Input
                      id="video_duration"
                      value={newVideo.duration}
                      onChange={(e) => setNewVideo({ ...newVideo, duration: e.target.value })}
                      placeholder="e.g., 5:23"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="video_category">Category</Label>
                    <Input
                      id="video_category"
                      value={newVideo.category}
                      onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value })}
                      placeholder="e.g., Performance, Behind the Scenes"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video_description">Description</Label>
                  <Textarea
                    id="video_description"
                    value={newVideo.description}
                    onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                    placeholder="Video description..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleAddVideo}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Video
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                            >
                              <Youtube className={`h-4 w-4 ${video.is_featured ? 'text-red-500' : 'text-gray-400'}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteVideo(video.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{video.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{video.views} views</span>
                          <Badge variant="outline" className="text-xs">{video.category}</Badge>
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

          {videos.length === 0 && (
            <div className="text-center py-12">
              <Youtube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
              <p className="text-gray-600 mb-4">Start by adding your first YouTube video</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Video
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};