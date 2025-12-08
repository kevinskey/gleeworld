import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save, Trash2, Eye, EyeOff, Edit, ExternalLink, RefreshCw, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
interface HeroSlide {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  mobile_image_url: string | null;
  ipad_image_url: string | null;
  display_order: number;
  is_active: boolean;
  link_url: string | null;
  link_target: string | null;
}
interface YouTubeVideo {
  id?: string;
  video_id: string;
  video_url: string | null;
  video_type: 'youtube' | 'uploaded';
  title: string;
  position: 'left' | 'right';
  is_active: boolean;
  autoplay: boolean;
  muted: boolean;
}
// Helper to extract YouTube video ID from URL or return as-is if already an ID
const extractYouTubeId = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  
  // Already a plain video ID (11 chars, alphanumeric with dashes/underscores)
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  
  // youtube.com/live/VIDEO_ID format
  const liveMatch = trimmed.match(/youtube\.com\/live\/([^?&]+)/);
  if (liveMatch) return liveMatch[1];
  
  // youtu.be/VIDEO_ID format
  const shortMatch = trimmed.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];
  
  // youtube.com/watch?v=VIDEO_ID format
  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  
  // youtube.com/embed/VIDEO_ID format
  const embedMatch = trimmed.match(/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];
  
  // Return trimmed if nothing matched
  return trimmed.slice(0, 50);
};

export const DashboardHeroManagerModule = () => {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [savingYouTube, setSavingYouTube] = useState(false);
  const {
    toast
  } = useToast();
  const [scrollSettings, setScrollSettings] = useState({
    auto_scroll_enabled: true,
    scroll_speed_seconds: 5
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [leftVideo, setLeftVideo] = useState<YouTubeVideo>({
    video_id: '',
    video_url: null,
    video_type: 'youtube',
    title: '',
    position: 'left',
    is_active: true,
    autoplay: false,
    muted: true
  });
  const [rightVideo, setRightVideo] = useState<YouTubeVideo>({
    video_id: '',
    video_url: null,
    video_type: 'youtube',
    title: '',
    position: 'right',
    is_active: true,
    autoplay: false,
    muted: true
  });
  const [uploadingVideo, setUploadingVideo] = useState<'left' | 'right' | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    mobile_image_url: "",
    ipad_image_url: "",
    display_order: 0,
    is_active: true,
    link_url: "",
    link_target: "internal"
  });
  useEffect(() => {
    fetchHeroSlides();
    fetchScrollSettings();
    fetchYouTubeVideos();
    setupGleeCamTag();
  }, []);
  const setupGleeCamTag = async () => {
    try {
      await supabase.functions.invoke('setup-glee-cam-tag');
    } catch (error) {
      console.error('Error setting up Glee Cam tag:', error);
    }
  };
  const syncGleeCamPhotos = async () => {
    setSyncing(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('sync-glee-cam-to-heroes');
      if (error) throw error;
      toast({
        title: "Success",
        description: data.message || "Glee Cam photos synced to heroes"
      });

      // Refresh hero slides
      fetchHeroSlides();
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Error",
        description: "Failed to sync Glee Cam photos",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };
  const fetchHeroSlides = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('dashboard_hero_slides').select('*').order('display_order', {
        ascending: true
      });
      if (error) throw error;
      setHeroSlides(data || []);
    } catch (error) {
      console.error('Error fetching dashboard hero slides:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard hero slides",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchScrollSettings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('dashboard_hero_settings').select('*').limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setScrollSettings({
          auto_scroll_enabled: data.auto_scroll_enabled,
          scroll_speed_seconds: data.scroll_speed_seconds
        });
        setSettingsId(data.id);
      }
    } catch (error) {
      console.error('Error fetching scroll settings:', error);
    }
  };

  const fetchYouTubeVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_youtube_videos')
        .select('*')
        .order('position');
      
      if (error) throw error;
      
      if (data) {
        const left = data.find(v => v.position === 'left');
        const right = data.find(v => v.position === 'right');
        
        if (left) {
          setLeftVideo({
            id: left.id,
            video_id: left.video_id,
            video_url: left.video_url || null,
            video_type: (left.video_type || 'youtube') as 'youtube' | 'uploaded',
            title: left.title || '',
            position: 'left',
            is_active: left.is_active,
            autoplay: left.autoplay,
            muted: left.muted
          });
        }
        
        if (right) {
          setRightVideo({
            id: right.id,
            video_id: right.video_id,
            video_url: right.video_url || null,
            video_type: (right.video_type || 'youtube') as 'youtube' | 'uploaded',
            title: right.title || '',
            position: 'right',
            is_active: right.is_active,
            autoplay: right.autoplay,
            muted: right.muted
          });
        }
      }
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
    }
  };

  const saveYouTubeVideo = async (video: YouTubeVideo) => {
    setSavingYouTube(true);
    try {
      const videoData = {
        video_id: video.video_id || '',
        video_url: video.video_url,
        video_type: video.video_type,
        title: video.title || null,
        position: video.position,
        is_active: video.is_active,
        autoplay: video.autoplay,
        muted: video.muted
      };

      if (video.id) {
        const { error } = await supabase
          .from('dashboard_youtube_videos')
          .update(videoData)
          .eq('id', video.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dashboard_youtube_videos')
          .insert(videoData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `${video.position === 'left' ? 'Left' : 'Right'} video saved successfully`
      });
      
      fetchYouTubeVideos();
    } catch (error) {
      console.error('Error saving video:', error);
      toast({
        title: "Error",
        description: "Failed to save video",
        variant: "destructive"
      });
    } finally {
      setSavingYouTube(false);
    }
  };

  const handleVideoUpload = async (file: File, position: 'left' | 'right') => {
    setUploadingVideo(position);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `dashboard-video-${position}-${Date.now()}.${fileExt}`;
      const filePath = `dashboard-videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gw-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('gw-media')
        .getPublicUrl(filePath);

      const videoUrl = urlData.publicUrl;
      
      const setVideo = position === 'left' ? setLeftVideo : setRightVideo;
      setVideo(prev => ({
        ...prev,
        video_type: 'uploaded',
        video_url: videoUrl,
        video_id: ''
      }));

      toast({
        title: "Success",
        description: "Video uploaded successfully. Click Save to confirm."
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: "Error",
        description: "Failed to upload video",
        variant: "destructive"
      });
    } finally {
      setUploadingVideo(null);
    }
  };
  const updateScrollSettings = async () => {
    try {
      if (settingsId) {
        const {
          error
        } = await supabase.from('dashboard_hero_settings').update(scrollSettings).eq('id', settingsId);
        if (error) throw error;
      } else {
        const {
          data,
          error
        } = await supabase.from('dashboard_hero_settings').insert([scrollSettings]).select().single();
        if (error) throw error;
        setSettingsId(data.id);
      }
      toast({
        title: "Success",
        description: "Scroll settings updated"
      });
    } catch (error) {
      console.error('Error updating scroll settings:', error);
      toast({
        title: "Error",
        description: "Failed to update scroll settings",
        variant: "destructive"
      });
    }
  };
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, imageType: 'desktop' | 'mobile' | 'ipad') => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `dashboard-hero-${imageType}-${Date.now()}.${fileExt}`;
      const filePath = `hero-images/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('user-files').upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('user-files').getPublicUrl(filePath);
      const fieldName = imageType === 'desktop' ? 'image_url' : imageType === 'mobile' ? 'mobile_image_url' : 'ipad_image_url';
      setFormData(prev => ({
        ...prev,
        [fieldName]: publicUrl
      }));
      toast({
        title: "Success",
        description: `${imageType} image uploaded successfully`
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: `Failed to upload ${imageType} image`,
        variant: "destructive"
      });
    }
  };
  const handleSave = async () => {
    if (!formData.image_url.trim()) {
      toast({
        title: "Error",
        description: "Desktop image is required",
        variant: "destructive"
      });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const {
          error
        } = await supabase.from('dashboard_hero_slides').update({
          title: formData.title.trim() || null,
          description: formData.description || null,
          image_url: formData.image_url,
          mobile_image_url: formData.mobile_image_url || null,
          ipad_image_url: formData.ipad_image_url || null,
          display_order: formData.display_order,
          is_active: formData.is_active,
          link_url: formData.link_url.trim() || null,
          link_target: formData.link_target
        }).eq('id', editingId);
        if (error) throw error;
      } else {
        const {
          error
        } = await supabase.from('dashboard_hero_slides').insert({
          title: formData.title.trim() || null,
          description: formData.description || null,
          image_url: formData.image_url,
          mobile_image_url: formData.mobile_image_url || null,
          ipad_image_url: formData.ipad_image_url || null,
          display_order: formData.display_order,
          is_active: formData.is_active,
          link_url: formData.link_url.trim() || null,
          link_target: formData.link_target
        });
        if (error) throw error;
      }
      toast({
        title: "Success",
        description: editingId ? "Hero slide updated" : "Hero slide created"
      });
      resetForm();
      fetchHeroSlides();
    } catch (error) {
      console.error('Error saving dashboard hero slide:', error);
      toast({
        title: "Error",
        description: "Failed to save dashboard hero slide",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const handleEdit = (slide: HeroSlide) => {
    setFormData({
      title: slide.title || "",
      description: slide.description || "",
      image_url: slide.image_url || "",
      mobile_image_url: slide.mobile_image_url || "",
      ipad_image_url: slide.ipad_image_url || "",
      display_order: slide.display_order || 0,
      is_active: slide.is_active ?? true,
      link_url: slide.link_url || "",
      link_target: slide.link_target || "internal"
    });
    setEditingId(slide.id);
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dashboard hero slide?')) return;
    try {
      const {
        error
      } = await supabase.from('dashboard_hero_slides').delete().eq('id', id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Dashboard hero slide deleted"
      });
      fetchHeroSlides();
    } catch (error) {
      console.error('Error deleting dashboard hero slide:', error);
      toast({
        title: "Error",
        description: "Failed to delete dashboard hero slide",
        variant: "destructive"
      });
    }
  };
  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const {
        error
      } = await supabase.from('dashboard_hero_slides').update({
        is_active: !currentStatus
      }).eq('id', id);
      if (error) throw error;
      fetchHeroSlides();
      toast({
        title: "Success",
        description: `Dashboard hero slide ${!currentStatus ? 'activated' : 'deactivated'}`
      });
    } catch (error) {
      console.error('Error toggling dashboard hero slide status:', error);
      toast({
        title: "Error",
        description: "Failed to update dashboard hero slide status",
        variant: "destructive"
      });
    }
  };
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      image_url: "",
      mobile_image_url: "",
      ipad_image_url: "",
      display_order: 0,
      is_active: true,
      link_url: "",
      link_target: "internal"
    });
    setEditingId(null);
  };
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle>Dashboard Hero Slide Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading dashboard hero slides...</div>
          </div>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      {/* Glee Cam Sync Alert */}
      <Alert className="border-primary/30 bg-primary/10">
        <Camera className="h-4 w-4 text-foreground" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-foreground">Photos tagged with "Glee Cam" in PR Hub automatically sync to landing page heroes</span>
          <Button onClick={syncGleeCamPhotos} disabled={syncing} size="sm" variant="outline">
            {syncing ? <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </> : <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Glee Cam Now
              </>}
          </Button>
        </AlertDescription>
      </Alert>

      {/* Scroll Settings Card */}
      <Card className="border-2 border-border bg-card">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">⚙️</div>
            Carousel Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-scroll" className="text-foreground">Auto Scroll</Label>
              <p className="text-sm text-muted-foreground">Automatically advance slides</p>
            </div>
            <Switch id="auto-scroll" checked={scrollSettings.auto_scroll_enabled} onCheckedChange={checked => setScrollSettings(prev => ({
            ...prev,
            auto_scroll_enabled: checked
          }))} />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Scroll Speed: {scrollSettings.scroll_speed_seconds}s</Label>
              <span className="text-sm text-muted-foreground">(2-30 seconds)</span>
            </div>
            <Slider value={[scrollSettings.scroll_speed_seconds]} onValueChange={value => setScrollSettings(prev => ({
            ...prev,
            scroll_speed_seconds: value[0]
          }))} min={2} max={30} step={1} className="w-full" />
          </div>

          <Button onClick={updateScrollSettings} className="w-full" variant="secondary">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Dashboard Videos Section */}
      <Card className="border-2 border-border bg-card">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">📺</div>
            Dashboard Videos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <p className="text-sm text-muted-foreground">
            Configure two videos (YouTube or uploaded) to display at the top of the dashboard.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Video */}
            <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <span className="p-1 rounded bg-primary text-primary-foreground text-xs">1</span>
                Left Video
              </h4>
              
              {/* Video Type Selector */}
              <div className="space-y-1">
                <Label className="text-xs text-foreground">Video Source</Label>
                <Select 
                  value={leftVideo.video_type} 
                  onValueChange={(value: 'youtube' | 'uploaded') => setLeftVideo(prev => ({ 
                    ...prev, 
                    video_type: value,
                    video_id: value === 'uploaded' ? '' : prev.video_id,
                    video_url: value === 'youtube' ? null : prev.video_url
                  }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube Video</SelectItem>
                    <SelectItem value="uploaded">Upload Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              {leftVideo.video_type === 'youtube' && leftVideo.video_id && (
                <div className="aspect-video rounded overflow-hidden bg-muted">
                  <img 
                    src={`https://img.youtube.com/vi/${extractYouTubeId(leftVideo.video_id)}/mqdefault.jpg`}
                    alt="Left video preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {leftVideo.video_type === 'uploaded' && leftVideo.video_url && (
                <div className="aspect-video rounded overflow-hidden bg-muted">
                  <video 
                    src={leftVideo.video_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                </div>
              )}

              <div className="space-y-3">
                {leftVideo.video_type === 'youtube' ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-foreground">YouTube Video URL or ID</Label>
                    <Input
                      value={leftVideo.video_id}
                      onChange={(e) => setLeftVideo(prev => ({ ...prev, video_id: extractYouTubeId(e.target.value) }))}
                      placeholder="Paste URL or ID (e.g. dQw4w9WgXcQ)"
                      className="h-8 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste full URL or just the video ID
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs text-foreground">Upload Video File</Label>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(file, 'left');
                      }}
                      className="h-8 text-sm"
                      disabled={uploadingVideo === 'left'}
                    />
                    {uploadingVideo === 'left' && (
                      <p className="text-xs text-primary animate-pulse">Uploading video...</p>
                    )}
                    {leftVideo.video_url && (
                      <p className="text-xs text-muted-foreground truncate">
                        Current: {leftVideo.video_url.split('/').pop()}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">Title (optional)</Label>
                  <Input
                    value={leftVideo.title}
                    onChange={(e) => setLeftVideo(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Video title"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-foreground">Active</Label>
                  <Switch
                    checked={leftVideo.is_active}
                    onCheckedChange={(checked) => setLeftVideo(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-foreground">Autoplay</Label>
                  <Switch
                    checked={leftVideo.autoplay}
                    onCheckedChange={(checked) => setLeftVideo(prev => ({ ...prev, autoplay: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-foreground">Muted</Label>
                  <Switch
                    checked={leftVideo.muted}
                    onCheckedChange={(checked) => setLeftVideo(prev => ({ ...prev, muted: checked }))}
                  />
                </div>
                <Button 
                  onClick={() => saveYouTubeVideo(leftVideo)} 
                  disabled={(!leftVideo.video_id && !leftVideo.video_url) || savingYouTube || uploadingVideo === 'left'}
                  size="sm"
                  className="w-full"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {leftVideo.id ? 'Update' : 'Save'} Left Video
                </Button>
              </div>
            </div>

            {/* Right Video */}
            <div className="space-y-4 p-4 bg-accent/5 rounded-lg border border-accent/20">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <span className="p-1 rounded bg-accent text-accent-foreground text-xs">2</span>
                Right Video
              </h4>
              
              {/* Video Type Selector */}
              <div className="space-y-1">
                <Label className="text-xs text-foreground">Video Source</Label>
                <Select 
                  value={rightVideo.video_type} 
                  onValueChange={(value: 'youtube' | 'uploaded') => setRightVideo(prev => ({ 
                    ...prev, 
                    video_type: value,
                    video_id: value === 'uploaded' ? '' : prev.video_id,
                    video_url: value === 'youtube' ? null : prev.video_url
                  }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube Video</SelectItem>
                    <SelectItem value="uploaded">Upload Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              {rightVideo.video_type === 'youtube' && rightVideo.video_id && (
                <div className="aspect-video rounded overflow-hidden bg-muted">
                  <img 
                    src={`https://img.youtube.com/vi/${extractYouTubeId(rightVideo.video_id)}/mqdefault.jpg`}
                    alt="Right video preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {rightVideo.video_type === 'uploaded' && rightVideo.video_url && (
                <div className="aspect-video rounded overflow-hidden bg-muted">
                  <video 
                    src={rightVideo.video_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                </div>
              )}

              <div className="space-y-3">
                {rightVideo.video_type === 'youtube' ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-foreground">YouTube Video URL or ID</Label>
                    <Input
                      value={rightVideo.video_id}
                      onChange={(e) => setRightVideo(prev => ({ ...prev, video_id: extractYouTubeId(e.target.value) }))}
                      placeholder="Paste URL or ID (e.g. dQw4w9WgXcQ)"
                      className="h-8 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste full URL or just the video ID
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs text-foreground">Upload Video File</Label>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(file, 'right');
                      }}
                      className="h-8 text-sm"
                      disabled={uploadingVideo === 'right'}
                    />
                    {uploadingVideo === 'right' && (
                      <p className="text-xs text-primary animate-pulse">Uploading video...</p>
                    )}
                    {rightVideo.video_url && (
                      <p className="text-xs text-muted-foreground truncate">
                        Current: {rightVideo.video_url.split('/').pop()}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">Title (optional)</Label>
                  <Input
                    value={rightVideo.title}
                    onChange={(e) => setRightVideo(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Video title"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-foreground">Active</Label>
                  <Switch
                    checked={rightVideo.is_active}
                    onCheckedChange={(checked) => setRightVideo(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-foreground">Autoplay</Label>
                  <Switch
                    checked={rightVideo.autoplay}
                    onCheckedChange={(checked) => setRightVideo(prev => ({ ...prev, autoplay: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-foreground">Muted</Label>
                  <Switch
                    checked={rightVideo.muted}
                    onCheckedChange={(checked) => setRightVideo(prev => ({ ...prev, muted: checked }))}
                  />
                </div>
                <Button 
                  onClick={() => saveYouTubeVideo(rightVideo)} 
                  disabled={(!rightVideo.video_id && !rightVideo.video_url) || savingYouTube || uploadingVideo === 'right'}
                  size="sm"
                  className="w-full"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {rightVideo.id ? 'Update' : 'Save'} Right Video
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create New Slide Form - only shows when NOT editing */}
      {!editingId && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Create New Dashboard Hero Slide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Title</Label>
              <Input value={formData.title} onChange={e => setFormData(prev => ({
                ...prev,
                title: e.target.value
              }))} placeholder="Concert title" />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(prev => ({
                ...prev,
                description: e.target.value
              }))} placeholder="Event details" rows={3} />
            </div>

            {/* Image Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Desktop Image *</Label>
                <Input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'desktop')} />
                {formData.image_url && <p className="text-xs text-muted-foreground">✓ Uploaded</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">iPad Image</Label>
                <Input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'ipad')} />
                {formData.ipad_image_url && <p className="text-xs text-muted-foreground">✓ Uploaded</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Mobile Image</Label>
                <Input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'mobile')} />
                {formData.mobile_image_url && <p className="text-xs text-muted-foreground">✓ Uploaded</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Display Order</Label>
                <Input type="number" value={formData.display_order} onChange={e => setFormData(prev => ({
                  ...prev,
                  display_order: parseInt(e.target.value) || 0
                }))} />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch checked={formData.is_active} onCheckedChange={checked => setFormData(prev => ({
                  ...prev,
                  is_active: checked
                }))} />
                <Label className="text-foreground">Active</Label>
              </div>
            </div>

            {/* Link Settings */}
            <div className="border-t border-border pt-4 space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-foreground">
                <ExternalLink className="h-4 w-4" />
                Link Settings (Optional)
              </h3>
              <div className="space-y-2">
                <Label className="text-foreground">Link URL</Label>
                <Input value={formData.link_url} onChange={e => setFormData(prev => ({
                  ...prev,
                  link_url: e.target.value
                }))} placeholder="/shop or https://example.com" />
                <p className="text-xs text-muted-foreground">Internal links: /page-name, External: https://...</p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Link Type</Label>
                <Select value={formData.link_target} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  link_target: value
                }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal (same tab)</SelectItem>
                    <SelectItem value="external">External (new tab)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Create'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Slides List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Existing Slides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {heroSlides.map(slide => (
              <div key={slide.id} className="border border-border rounded-lg bg-card overflow-hidden">
                {/* Slide Row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-32 h-20 rounded-md overflow-hidden bg-muted">
                    <img src={slide.image_url} alt={slide.title || 'Hero slide'} className="w-full h-full object-cover" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground">{slide.title || 'Untitled'}</h4>
                    <p className="text-sm text-muted-foreground truncate">{slide.description || 'No description'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Order: {slide.display_order}</p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(slide.id, slide.is_active)}>
                      {slide.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(slide)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(slide.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Inline Edit Form - appears below the image when editing this slide */}
                {editingId === slide.id && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                    {/* Large Image Preview */}
                    <div className="w-full max-h-64 rounded-lg overflow-hidden bg-muted mb-4">
                      <img src={slide.image_url} alt={slide.title || 'Hero slide'} className="w-full h-full object-contain" />
                    </div>

                    {/* Edit Fields */}
                    <div className="space-y-2">
                      <Label className="text-foreground">Title</Label>
                      <Input value={formData.title} onChange={e => setFormData(prev => ({
                        ...prev,
                        title: e.target.value
                      }))} placeholder="Concert title" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground">Description</Label>
                      <Textarea value={formData.description} onChange={e => setFormData(prev => ({
                        ...prev,
                        description: e.target.value
                      }))} placeholder="Event details" rows={3} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Display Order</Label>
                        <Input type="number" value={formData.display_order} onChange={e => setFormData(prev => ({
                          ...prev,
                          display_order: parseInt(e.target.value) || 0
                        }))} />
                      </div>
                      <div className="flex items-center space-x-2 pt-8">
                        <Switch checked={formData.is_active} onCheckedChange={checked => setFormData(prev => ({
                          ...prev,
                          is_active: checked
                        }))} />
                        <Label className="text-foreground">Active</Label>
                      </div>
                    </div>

                    {/* Link Settings */}
                    <div className="border-t border-border pt-4 space-y-4">
                      <h3 className="font-medium flex items-center gap-2 text-foreground text-sm">
                        <ExternalLink className="h-4 w-4" />
                        Link Settings (Optional)
                      </h3>
                      <div className="space-y-2">
                        <Label className="text-foreground">Link URL</Label>
                        <Input value={formData.link_url} onChange={e => setFormData(prev => ({
                          ...prev,
                          link_url: e.target.value
                        }))} placeholder="/shop or https://example.com" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Link Type</Label>
                        <Select value={formData.link_target} onValueChange={value => setFormData(prev => ({
                          ...prev,
                          link_target: value
                        }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">Internal (same tab)</SelectItem>
                            <SelectItem value="external">External (new tab)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Update'}
                      </Button>
                      <Button variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>;
};