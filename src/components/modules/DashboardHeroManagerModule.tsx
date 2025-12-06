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
export const DashboardHeroManagerModule = () => {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const {
    toast
  } = useToast();
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
    display_order: 0,
    is_active: true,
    link_url: "",
    link_target: "internal"
  });
  useEffect(() => {
    fetchHeroSlides();
    fetchScrollSettings();
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
      <Alert className="border-blue-200 bg-blue-50">
        <Camera className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-primary-foreground">Photos tagged with "Glee Cam" in PR Hub automatically sync to landing page heroes</span>
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
      <Card className="border-2 border-accent/20">
        <CardHeader className="bg-gradient-to-r from-accent/5 to-accent/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700">⚙️</div>
            Carousel Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-scroll">Auto Scroll</Label>
              <p className="text-sm text-muted-foreground">Automatically advance slides</p>
            </div>
            <Switch id="auto-scroll" checked={scrollSettings.auto_scroll_enabled} onCheckedChange={checked => setScrollSettings(prev => ({
            ...prev,
            auto_scroll_enabled: checked
          }))} />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Scroll Speed: {scrollSettings.scroll_speed_seconds}s</Label>
              <span className="text-sm text-muted-foreground">(2-30 seconds)</span>
            </div>
            <Slider value={[scrollSettings.scroll_speed_seconds]} onValueChange={value => setScrollSettings(prev => ({
            ...prev,
            scroll_speed_seconds: value[0]
          }))} min={2} max={30} step={1} className="w-full" />
          </div>

          <Button onClick={updateScrollSettings} className="w-full bg-zinc-200 hover:bg-zinc-100 p-[10px]">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit" : "Create"} Dashboard Hero Slide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={formData.title} onChange={e => setFormData(prev => ({
            ...prev,
            title: e.target.value
          }))} placeholder="Concert title" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={e => setFormData(prev => ({
            ...prev,
            description: e.target.value
          }))} placeholder="Event details" rows={3} />
          </div>

          {/* Image Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Desktop Image *</Label>
              <Input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'desktop')} />
              {formData.image_url && <p className="text-xs text-muted-foreground">✓ Uploaded</p>}
            </div>
            <div className="space-y-2">
              <Label>iPad Image</Label>
              <Input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'ipad')} />
              {formData.ipad_image_url && <p className="text-xs text-muted-foreground">✓ Uploaded</p>}
            </div>
            <div className="space-y-2">
              <Label>Mobile Image</Label>
              <Input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'mobile')} />
              {formData.mobile_image_url && <p className="text-xs text-muted-foreground">✓ Uploaded</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Display Order</Label>
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
              <Label>Active</Label>
            </div>
          </div>

          {/* Link Settings */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Link Settings (Optional)
            </h3>
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input value={formData.link_url} onChange={e => setFormData(prev => ({
              ...prev,
              link_url: e.target.value
            }))} placeholder="/shop or https://example.com" />
              <p className="text-xs text-muted-foreground">Internal links: /page-name, External: https://...</p>
            </div>
            <div className="space-y-2">
              <Label>Link Type</Label>
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

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
            {editingId && <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>}
          </div>
        </CardContent>
      </Card>

      {/* Slides List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Slides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {heroSlides.map(slide => <div key={slide.id} className="flex items-center gap-4 p-4 border rounded-lg">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-32 h-20 rounded-md overflow-hidden bg-muted">
                  <img src={slide.image_url} alt={slide.title || 'Hero slide'} className="w-full h-full object-cover" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium">{slide.title || 'Untitled'}</h4>
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
              </div>)}
          </div>
        </CardContent>
      </Card>
    </div>;
};