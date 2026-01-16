import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Save, Trash2, Eye, EyeOff, Edit, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdvertisingHeroManager } from "./AdvertisingHeroManager";
import { LykeHouseHeroManager } from "./LykeHouseHeroManager";
import { AmazonProductSuggester } from "./AmazonProductSuggester";
import { UnifiedHeroSelector, HERO_CONTEXTS, type HeroContext } from "./UnifiedHeroSelector";
import { SlideEditForm } from "./hero/SlideEditForm";

interface HeroSlide {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  mobile_image_url: string | null;
  ipad_image_url: string | null;
  video_url: string | null; // YouTube video URL
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  duration_ms: number | null;
  layout: string | null;
  transition: string | null;
}

interface HeroSettings {
  id: string;
  auto_play: boolean;
  slide_duration_seconds: number;
  transition_effect: string;
}

interface YouTubeVideoConfig {
  id?: string;
  position: 'left' | 'right';
  video_id: string;
  title: string;
  is_active: boolean;
  autoplay: boolean;
  muted: boolean;
}

export const HeroManagement = () => {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Hero context selector state
  const [selectedContext, setSelectedContext] = useState<HeroContext>(HERO_CONTEXTS[0]);
  const [slideCounts, setSlideCounts] = useState<Record<string, number>>({});

  // YouTube video state
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideoConfig[]>([]);
  const [leftVideo, setLeftVideo] = useState<YouTubeVideoConfig>({
    position: 'left',
    video_id: '',
    title: '',
    is_active: true,
    autoplay: false,
    muted: true
  });
  const [rightVideo, setRightVideo] = useState<YouTubeVideoConfig>({
    position: 'right',
    video_id: '',
    title: '',
    is_active: true,
    autoplay: false,
    muted: true
  });
  const [savingYouTube, setSavingYouTube] = useState(false);

  const [scrollSettings, setScrollSettings] = useState({
    auto_scroll_enabled: true,
    scroll_speed_seconds: 5
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    mobile_image_url: "",
    ipad_image_url: "",
    video_url: "", // YouTube video URL
    display_order: 0,
    is_active: true,
    duration_ms: null as number | null,
    layout: 'one' as 'one' | 'two' | 'three',
    transition: 'fade' as 'fade' | 'left' | 'right' | 'up' | 'down' | 'zoom'
  });

  // Fetch slide counts for all contexts
  const fetchSlideCounts = async () => {
    try {
      const counts: Record<string, number> = {};
      
      // Fetch gw_hero_slides counts by usage_context
      const { data: gwSlides } = await supabase
        .from('gw_hero_slides')
        .select('usage_context');
      
      if (gwSlides) {
        const homepageCount = gwSlides.filter(s => s.usage_context === 'homepage').length;
        const pressKitCount = gwSlides.filter(s => s.usage_context === 'press_kit').length;
        counts['public-landing-top'] = homepageCount;
        counts['press-kit'] = pressKitCount;
      }
      
      // Fetch dashboard_hero_slides count
      const { count: dashboardCount } = await supabase
        .from('dashboard_hero_slides')
        .select('*', { count: 'exact', head: true });
      counts['member-dashboard'] = dashboardCount || 0;
      
      // Fetch advertising_hero count
      const { count: adCount } = await supabase
        .from('advertising_hero')
        .select('*', { count: 'exact', head: true });
      counts['advertising'] = adCount || 0;
      
      // Fetch lyke_house_hero count
      const { count: lykeCount } = await supabase
        .from('lyke_house_hero')
        .select('*', { count: 'exact', head: true });
      counts['lyke-house'] = lykeCount || 0;
      
      setSlideCounts(counts);
    } catch (error) {
      console.error('Error fetching slide counts:', error);
    }
  };

  useEffect(() => {
    fetchHeroSlides();
    fetchScrollSettings();
    fetchYouTubeVideos();
    fetchSlideCounts();
  }, []);

  // Re-fetch when context changes
  useEffect(() => {
    fetchHeroSlides();
    resetForm();
  }, [selectedContext]);

  const fetchHeroSlides = async () => {
    setLoading(true);
    try {
      let slidesData: HeroSlide[] = [];
      
      if (selectedContext.table === 'gw_hero_slides') {
        const { data, error } = await supabase
          .from('gw_hero_slides')
          .select('*')
          .eq('usage_context', selectedContext.usageContext || 'homepage')
          .order('display_order', { ascending: true });
        if (error) throw error;
        slidesData = (data || []).map(s => ({
          id: s.id,
          title: s.title,
          description: s.description,
          image_url: s.image_url || '',
          mobile_image_url: s.mobile_image_url,
          ipad_image_url: s.ipad_image_url,
          video_url: s.video_url ?? null,
          display_order: s.display_order,
          is_active: s.is_active,
          created_at: s.created_at,
          updated_at: s.created_at,
          duration_ms: s.duration_ms ?? 6000,
          layout: s.layout ?? 'one',
          transition: s.transition ?? 'fade'
        }));
      } else if (selectedContext.table === 'dashboard_hero_slides') {
        const { data, error } = await supabase
          .from('dashboard_hero_slides')
          .select('*')
          .order('display_order', { ascending: true });
        if (error) throw error;
        slidesData = (data || []).map(s => ({
          id: s.id,
          title: s.title,
          description: s.description,
          image_url: s.image_url || '',
          mobile_image_url: s.mobile_image_url,
          ipad_image_url: s.ipad_image_url,
          video_url: null, // dashboard_hero_slides doesn't have video_url yet
          display_order: s.display_order,
          is_active: s.is_active,
          created_at: s.created_at,
          updated_at: s.updated_at,
          duration_ms: s.duration_ms ?? 6000,
          layout: s.layout ?? 'one',
          transition: s.transition ?? 'fade'
        }));
      } else if (selectedContext.table === 'advertising_hero') {
        const { data, error } = await supabase
          .from('advertising_hero')
          .select('*')
          .order('display_order', { ascending: true });
        if (error) throw error;
        slidesData = (data || []).map(s => ({
          id: s.id,
          title: s.title,
          description: s.description,
          image_url: s.image_url || '',
          mobile_image_url: s.mobile_image_url,
          ipad_image_url: s.ipad_image_url,
          video_url: null, // advertising_hero doesn't have video_url
          display_order: s.display_order,
          is_active: s.is_active,
          created_at: s.created_at,
          updated_at: s.updated_at,
          duration_ms: s.duration_ms ?? 6000,
          layout: s.layout ?? 'one',
          transition: s.transition ?? 'fade'
        }));
      }
      
      setHeroSlides(slidesData);
    } catch (error) {
      console.error('Error fetching hero data:', error);
      toast({
        title: "Error",
        description: "Failed to load hero data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchScrollSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_hero_settings')
        .select('*')
        .limit(1)
        .single();

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
      
      const videos = data || [];
      setYoutubeVideos(videos.map(v => ({ ...v, position: v.position as 'left' | 'right' })));
      
      const left = videos.find(v => v.position === 'left');
      const right = videos.find(v => v.position === 'right');
      
      if (left) {
        setLeftVideo({
          id: left.id,
          position: 'left',
          video_id: left.video_id,
          title: left.title || '',
          is_active: left.is_active,
          autoplay: left.autoplay,
          muted: left.muted
        });
      }
      
      if (right) {
        setRightVideo({
          id: right.id,
          position: 'right',
          video_id: right.video_id,
          title: right.title || '',
          is_active: right.is_active,
          autoplay: right.autoplay,
          muted: right.muted
        });
      }
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
    }
  };

  const saveYouTubeVideo = async (video: YouTubeVideoConfig) => {
    setSavingYouTube(true);
    try {
      if (video.id) {
        // Update existing
        const { error } = await supabase
          .from('dashboard_youtube_videos')
          .update({
            video_id: video.video_id,
            title: video.title || null,
            is_active: video.is_active,
            autoplay: video.autoplay,
            muted: video.muted
          })
          .eq('id', video.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('dashboard_youtube_videos')
          .insert({
            position: video.position,
            video_id: video.video_id,
            title: video.title || null,
            is_active: video.is_active,
            autoplay: video.autoplay,
            muted: video.muted
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `${video.position === 'left' ? 'Left' : 'Right'} video saved`
      });

      fetchYouTubeVideos();
    } catch (error) {
      console.error('Error saving YouTube video:', error);
      toast({
        title: "Error",
        description: "Failed to save video",
        variant: "destructive"
      });
    } finally {
      setSavingYouTube(false);
    }
  };

  const updateScrollSettings = async () => {
    try {
      if (settingsId) {
        const { error } = await supabase
          .from('dashboard_hero_settings')
          .update(scrollSettings)
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('dashboard_hero_settings')
          .insert([scrollSettings])
          .select()
          .single();

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
      const fileName = `hero-${imageType}-${Date.now()}.${fileExt}`;
      const filePath = `hero-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      const fieldName = imageType === 'desktop' ? 'image_url' : 
                       imageType === 'mobile' ? 'mobile_image_url' : 'ipad_image_url';
      setFormData(prev => ({ ...prev, [fieldName]: publicUrl }));
      
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
        description: "Image is required",
        variant: "destructive",
      });
      return;
    }

    // NOTE: This module supports multiple hero contexts. Persist edits to the currently selected table.
    const table = selectedContext.table;

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim() || null,
        description: formData.description || null,
        image_url: formData.image_url || null,
        mobile_image_url: formData.mobile_image_url || null,
        ipad_image_url: formData.ipad_image_url || null,
        video_url: formData.video_url || null,
        display_order: formData.display_order,
        is_active: formData.is_active,
        duration_ms: formData.duration_ms,
        layout: formData.layout,
        transition: formData.transition,
      } as const;

      if (editingId && editingId !== 'new') {
        // Update existing
        let updateQuery = supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(table as any)
          .update(payload)
          .eq('id', editingId);

        // gw_hero_slides is context-scoped
        if (table === 'gw_hero_slides') {
          updateQuery = updateQuery.eq('usage_context', selectedContext.usageContext || 'homepage');
        }

        // PostgREST returns 204 even when 0 rows are affected; select() lets us detect that.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (updateQuery as any).select('id').maybeSingle();
        if (error) throw error;
        if (!data?.id) {
          throw new Error('Slide not found in the selected hero context (no rows updated).');
        }
      } else {
        // Create new
        const insertPayload =
          table === 'gw_hero_slides'
            ? {
                ...payload,
                usage_context: selectedContext.usageContext || 'homepage',
              }
            : payload;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(table as any) as any)
          .insert(insertPayload)
          .select('id')
          .single();

        if (error) throw error;
        if (!data?.id) {
          throw new Error('Failed to create slide (no id returned).');
        }
      }

      toast({
        title: "Success",
        description: editingId ? "Hero slide updated" : "Hero slide created",
      });

      resetForm();
      fetchHeroSlides();
    } catch (error) {
      console.error('Error saving hero slide:', error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save hero slide",
        variant: "destructive",
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
      video_url: slide.video_url || "",
      display_order: slide.display_order || 0,
      is_active: slide.is_active ?? true,
      duration_ms: slide.duration_ms || 6000,
      layout: (slide.layout as 'one' | 'two' | 'three') || 'one',
      transition: (slide.transition as 'fade' | 'left' | 'right' | 'up' | 'down' | 'zoom') || 'fade'
    });
    setEditingId(slide.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hero slide?')) return;

    const table = selectedContext.table;

    try {
      let deleteQuery = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .delete()
        .eq('id', id);

      if (table === 'gw_hero_slides') {
        deleteQuery = deleteQuery.eq('usage_context', selectedContext.usageContext || 'homepage');
      }

      const { error } = await deleteQuery;
      if (error) throw error;

      toast({
        title: "Success",
        description: "Hero slide deleted",
      });

      fetchHeroSlides();
    } catch (error) {
      console.error('Error deleting hero slide:', error);
      toast({
        title: "Error",
        description: "Failed to delete hero slide",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean | null) => {
    const table = selectedContext.table;

    try {
      let updateQuery = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (table === 'gw_hero_slides') {
        updateQuery = updateQuery.eq('usage_context', selectedContext.usageContext || 'homepage');
      }

      const { error } = await updateQuery;
      if (error) throw error;

      fetchHeroSlides();
      toast({
        title: "Success",
        description: `Hero slide ${!currentStatus ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error toggling hero slide status:', error);
      toast({
        title: "Error",
        description: "Failed to update hero slide status",
        variant: "destructive",
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
      video_url: "",
      display_order: 0,
      is_active: true,
      duration_ms: null,
      layout: 'one',
      transition: 'fade'
    });
    setEditingId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hero Slide Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading hero slides...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unified Hero Selector - TOP OF PAGE */}
      <Card className="border-2 border-primary/30 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            🎨 Hero Management Dashboard
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select a hero context below to manage its slides
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <UnifiedHeroSelector 
            selectedContext={selectedContext.id}
            onContextChange={setSelectedContext}
            slideCounts={slideCounts}
          />
        </CardContent>
      </Card>

      {/* Show context-specific content based on selection */}
      {selectedContext.id === 'advertising' ? (
        <>
          {/* AI Amazon Product Suggester */}
          <AmazonProductSuggester />
          {/* Advertising Hero Manager */}
          <AdvertisingHeroManager />
        </>
      ) : selectedContext.id === 'lyke-house' ? (
        <LykeHouseHeroManager />
      ) : (
        <>
          {/* Quick Settings Bar - only for dashboard context */}
          {selectedContext.id === 'member-dashboard' && (
            <Card className="border border-border/50">
              <CardContent className="py-4">
                {/* Compact Settings Row */}
                <div className="flex flex-wrap items-center gap-6">
                  {/* Auto Scroll Toggle */}
                  <div className="flex items-center gap-3">
                    <Switch
                      id="auto-scroll"
                      checked={scrollSettings.auto_scroll_enabled}
                      onCheckedChange={(checked) => setScrollSettings(prev => ({ ...prev, auto_scroll_enabled: checked }))}
                    />
                    <Label htmlFor="auto-scroll" className="text-sm font-medium cursor-pointer">
                      Auto Scroll
                    </Label>
                  </div>

                  {/* Speed Slider - Compact */}
                  <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-[300px]">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Speed:</Label>
                    <Slider
                      value={[scrollSettings.scroll_speed_seconds]}
                      onValueChange={(value) => setScrollSettings(prev => ({ ...prev, scroll_speed_seconds: value[0] }))}
                      min={2}
                      max={30}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono w-8">{scrollSettings.scroll_speed_seconds}s</span>
                  </div>

                  {/* Save Button */}
                  <Button onClick={updateScrollSettings} size="sm" variant="outline">
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>

                  {/* Divider */}
                  <div className="h-6 w-px bg-border hidden md:block" />

                  {/* YouTube Videos - Compact Inline */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-medium flex items-center gap-1">
                      📺 Videos:
                    </span>
                    
                    {/* Left Video Compact */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={leftVideo.video_id}
                        onChange={(e) => setLeftVideo(prev => ({ ...prev, video_id: e.target.value }))}
                        placeholder="Left Video ID"
                        className="h-8 w-32 text-xs"
                      />
                      <Switch
                        checked={leftVideo.is_active}
                        onCheckedChange={(checked) => {
                          setLeftVideo(prev => ({ ...prev, is_active: checked }));
                        }}
                      />
                      <Button 
                        onClick={() => saveYouTubeVideo(leftVideo)} 
                        disabled={!leftVideo.video_id || savingYouTube}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Right Video Compact */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={rightVideo.video_id}
                        onChange={(e) => setRightVideo(prev => ({ ...prev, video_id: e.target.value }))}
                        placeholder="Right Video ID"
                        className="h-8 w-32 text-xs"
                      />
                      <Switch
                        checked={rightVideo.is_active}
                        onCheckedChange={(checked) => {
                          setRightVideo(prev => ({ ...prev, is_active: checked }));
                        }}
                      />
                      <Button 
                        onClick={() => saveYouTubeVideo(rightVideo)} 
                        disabled={!rightVideo.video_id || savingYouTube}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Slides with Inline Editing */}
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-3">
                <div className="p-2 rounded bg-slate-100 text-slate-700">📋</div>
                {selectedContext.label} Slides
              </CardTitle>
              {!editingId && (
                <Button 
                  onClick={() => {
                    resetForm();
                    setEditingId('new');
                  }}
                  size="sm"
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Slide
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              {/* New Slide Form - shown at top when adding new */}
              {editingId === 'new' && (
                <div className="mb-4">
                  <SlideEditForm
                    formData={formData}
                    setFormData={setFormData}
                    onSave={handleSave}
                    onCancel={resetForm}
                    saving={saving}
                    isEditing={false}
                  />
                </div>
              )}
              
              {heroSlides.length === 0 && editingId !== 'new' ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎯</div>
                  <p className="text-lg text-muted-foreground">No hero slides found</p>
                  <p className="text-sm text-muted-foreground mb-4">Create your first one to get started!</p>
                  <Button onClick={() => setEditingId('new')} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add First Slide
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {heroSlides.map((slide) => (
                    <div key={slide.id} className="space-y-2">
                      {/* Slide Card */}
                      <Card className={`shadow-sm border-2 transition-colors ${editingId === slide.id ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/30'}`}>
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Image Thumbnails Section */}
                            <div className="flex-shrink-0">
                              <div className="grid grid-cols-1 gap-2">
                                {/* Desktop Image */}
                                {slide.image_url && (
                                  <div className="relative">
                                    <img
                                      src={slide.image_url}
                                      alt="Desktop preview"
                                      className="w-24 h-16 object-cover rounded-lg border-2 border-blue-200"
                                      onError={(e) => {
                                        e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";
                                      }}
                                    />
                                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                                      🖥️
                                    </div>
                                  </div>
                                )}
                                
                                {/* Mobile & iPad Preview Row */}
                                <div className="flex gap-2">
                                  {slide.mobile_image_url && (
                                    <div className="relative">
                                      <img
                                        src={slide.mobile_image_url}
                                        alt="Mobile preview"
                                        className="w-12 h-8 object-cover rounded border border-green-200"
                                      />
                                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded-full font-bold">
                                        📱
                                      </div>
                                    </div>
                                  )}
                                  
                                  {slide.ipad_image_url && (
                                    <div className="relative">
                                      <img
                                        src={slide.ipad_image_url}
                                        alt="iPad preview"
                                        className="w-12 h-8 object-cover rounded border border-purple-200"
                                      />
                                      <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs px-1 py-0.5 rounded-full font-bold">
                                        📄
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 min-w-0">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <h4 className="font-semibold text-lg text-primary leading-tight">
                                      {slide.title || 'Untitled Slide'}
                                    </h4>
                                    {slide.description && (
                                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                        {slide.description}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Status Badge */}
                                  <div className="flex items-center gap-2 ml-4">
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${slide.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                      {slide.is_active ? 'Active' : 'Inactive'}
                                    </div>
                                    <div className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-mono">
                                      #{slide.display_order || 0}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Actions Section */}
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                variant={editingId === slide.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  if (editingId === slide.id) {
                                    resetForm();
                                  } else {
                                    handleEdit(slide);
                                  }
                                }}
                                className="h-8 px-3 text-xs"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                {editingId === slide.id ? 'Close' : 'Edit'}
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleActive(slide.id, slide.is_active)}
                                className="h-8 px-3 text-xs"
                              >
                                {slide.is_active ? (
                                  <>
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3 mr-1" />
                                    Show
                                  </>
                                )}
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(slide.id)}
                                className="h-8 px-3 text-xs text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Inline Edit Form - appears below the slide being edited */}
                      {editingId === slide.id && (
                        <SlideEditForm
                          formData={formData}
                          setFormData={setFormData}
                          onSave={handleSave}
                          onCancel={resetForm}
                          saving={saving}
                          isEditing={true}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
