import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save, Trash2, Eye, EyeOff, ExternalLink, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HeroSlide {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  ipad_image_url: string | null;
  button_text: string | null;
  link_url: string | null;
  display_order: number | null;
  is_active: boolean | null;
  hero_settings_id: string | null;
  slide_duration_seconds: number | null;
  title_position_horizontal: string | null;
  title_position_vertical: string | null;
  description_position_horizontal: string | null;
  description_position_vertical: string | null;
  title_size: string | null;
  description_size: string | null;
  action_button_text: string | null;
  action_button_url: string | null;
  action_button_enabled: boolean | null;
  created_at: string | null;
}

interface HeroSettings {
  id: string;
  auto_play: boolean;
  slide_duration_seconds: number;
  transition_effect: string;
}

export const HeroManagement = () => {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroSettings, setHeroSettings] = useState<HeroSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    mobile_image_url: "",
    ipad_image_url: "",
    button_text: "",
    link_url: "",
    display_order: 0,
    slide_duration_seconds: 5,
    title_position_horizontal: "center",
    title_position_vertical: "middle",
    description_position_horizontal: "center", 
    description_position_vertical: "middle",
    title_size: "large",
    description_size: "medium",
    action_button_text: "",
    action_button_url: "",
    action_button_enabled: false,
    is_active: true
  });

  const [settingsData, setSettingsData] = useState({
    auto_play: true,
    slide_duration_seconds: 5,
    transition_effect: "fade"
  });

  useEffect(() => {
    fetchHeroSlides();
  }, []);

  const fetchHeroSlides = async () => {
    try {
      const { data: slidesData, error: slidesError } = await supabase
        .from('gw_hero_slides')
        .select('*')
        .order('display_order', { ascending: true });

      if (slidesError) throw slidesError;
      setHeroSlides(slidesData || []);

      // Try to fetch settings, but don't fail if table doesn't exist yet
      try {
        const { data: settingsData } = await supabase
          .from('gw_hero_settings')
          .select('*')
          .limit(1)
          .single();

        if (settingsData) {
          const settings = settingsData as any;
          setHeroSettings({
            id: settings.id,
            auto_play: settings.auto_play || true,
            slide_duration_seconds: settings.slide_duration_seconds || 5,
            transition_effect: settings.transition_effect || 'fade'
          });
          setSettingsData({
            auto_play: settings.auto_play || true,
            slide_duration_seconds: settings.slide_duration_seconds || 5,
            transition_effect: settings.transition_effect || 'fade'
          });
        }
      } catch (settingsError) {
        console.log('Settings not found, using defaults');
      }
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
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('gw_hero_slides')
          .update({
            title: formData.title.trim() || null,
            description: formData.description || null,
            image_url: formData.image_url || null,
            mobile_image_url: formData.mobile_image_url || null,
            ipad_image_url: formData.ipad_image_url || null,
            button_text: formData.button_text || null,
            link_url: formData.link_url || null,
            display_order: formData.display_order,
            slide_duration_seconds: formData.slide_duration_seconds,
            title_position_horizontal: formData.title_position_horizontal,
            title_position_vertical: formData.title_position_vertical,
            description_position_horizontal: formData.description_position_horizontal,
            description_position_vertical: formData.description_position_vertical,
            title_size: formData.title_size,
            description_size: formData.description_size,
            action_button_text: formData.action_button_text || null,
            action_button_url: formData.action_button_url || null,
            action_button_enabled: formData.action_button_enabled,
            is_active: formData.is_active
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('gw_hero_slides')
          .insert({
            title: formData.title.trim() || null,
            description: formData.description || null,
            image_url: formData.image_url || null,
            mobile_image_url: formData.mobile_image_url || null,
            ipad_image_url: formData.ipad_image_url || null,
            button_text: formData.button_text || null,
            link_url: formData.link_url || null,
            display_order: formData.display_order,
            slide_duration_seconds: formData.slide_duration_seconds,
            title_position_horizontal: formData.title_position_horizontal,
            title_position_vertical: formData.title_position_vertical,
            description_position_horizontal: formData.description_position_horizontal,
            description_position_vertical: formData.description_position_vertical,
            title_size: formData.title_size,
            description_size: formData.description_size,
            action_button_text: formData.action_button_text || null,
            action_button_url: formData.action_button_url || null,
            action_button_enabled: formData.action_button_enabled,
            is_active: formData.is_active
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
      console.error('Error saving hero slide:', error);
      toast({
        title: "Error",
        description: "Failed to save hero slide",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (slide: HeroSlide) => {
    console.log('Editing slide:', slide);
    setFormData({
      title: slide.title || "",
      description: slide.description || "",
      image_url: slide.image_url || "",
      mobile_image_url: slide.mobile_image_url || "",
      ipad_image_url: slide.ipad_image_url || "",
      button_text: slide.button_text || "",
      link_url: slide.link_url || "",
      display_order: slide.display_order || 0,
      slide_duration_seconds: slide.slide_duration_seconds || 5,
      title_position_horizontal: slide.title_position_horizontal || "center",
      title_position_vertical: slide.title_position_vertical || "middle",
      description_position_horizontal: slide.description_position_horizontal || "center",
      description_position_vertical: slide.description_position_vertical || "middle",
      title_size: slide.title_size || "large",
      description_size: slide.description_size || "medium",
      action_button_text: slide.action_button_text || "",
      action_button_url: slide.action_button_url || "",
      action_button_enabled: slide.action_button_enabled ?? false,
      is_active: slide.is_active ?? true
    });
    setEditingId(slide.id);
    console.log('Set editing ID to:', slide.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hero slide?')) return;

    try {
      const { error } = await supabase
        .from('gw_hero_slides')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Hero slide deleted"
      });

      fetchHeroSlides();
    } catch (error) {
      console.error('Error deleting hero slide:', error);
      toast({
        title: "Error",
        description: "Failed to delete hero slide",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase
        .from('gw_hero_slides')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      fetchHeroSlides();
      toast({
        title: "Success",
        description: `Hero slide ${!currentStatus ? 'activated' : 'deactivated'}`
      });
    } catch (error) {
      console.error('Error toggling hero slide status:', error);
      toast({
        title: "Error",
        description: "Failed to update hero slide status",
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
      button_text: "",
      link_url: "",
      display_order: 0,
      slide_duration_seconds: 5,
      title_position_horizontal: "center",
      title_position_vertical: "middle",
      description_position_horizontal: "center",
      description_position_vertical: "middle", 
      title_size: "large",
      description_size: "medium",
      action_button_text: "",
      action_button_url: "",
      action_button_enabled: false,
      is_active: true
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
    <div className="space-y-8">
      {/* Header Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="text-2xl flex items-center gap-3">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {editingId ? '✏️' : '➕'}
            </div>
            {editingId ? "Edit Hero Slide" : "Create New Hero Slide"}
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column - Content */}
        <div className="xl:col-span-3 space-y-6">
          {/* Basic Content Section */}
          <Card className="shadow-md">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-100 text-blue-700">📝</div>
                Content & Text
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter slide title..."
                    className="border-2 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="button_text" className="text-sm font-medium">Button Text</Label>
                  <Input
                    id="button_text"
                    value={formData.button_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                    placeholder="Enter button text..."
                    className="border-2 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter slide description..."
                  rows={3}
                  className="border-2 focus:border-primary resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link_url" className="text-sm font-medium">Link URL</Label>
                <Input
                  id="link_url"
                  value={formData.link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  placeholder="https://example.com"
                  className="border-2 focus:border-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Images Section */}
          <Card className="shadow-md">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 rounded bg-purple-100 text-purple-700">🖼️</div>
                Images
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Desktop Image */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 rounded bg-blue-500 text-white text-xs font-bold">🖥️</div>
                  <Label className="text-sm font-semibold text-blue-800">Desktop Image *</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="Enter image URL or upload below"
                    className="border-2 border-blue-300 focus:border-blue-500"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'desktop')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button variant="outline" size="icon" className="border-2 border-blue-300 hover:bg-blue-100">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mobile Image */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 rounded bg-green-500 text-white text-xs font-bold">📱</div>
                  <Label className="text-sm font-semibold text-green-800">Mobile Image</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="mobile_image_url"
                    value={formData.mobile_image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobile_image_url: e.target.value }))}
                    placeholder="Enter mobile image URL or upload below"
                    className="border-2 border-green-300 focus:border-green-500"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'mobile')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button variant="outline" size="icon" className="border-2 border-green-300 hover:bg-green-100">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* iPad Image */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 rounded bg-purple-500 text-white text-xs font-bold">📄</div>
                  <Label className="text-sm font-semibold text-purple-800">iPad Image</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="ipad_image_url"
                    value={formData.ipad_image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, ipad_image_url: e.target.value }))}
                    placeholder="Enter iPad image URL or upload below"
                    className="border-2 border-purple-300 focus:border-purple-500"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'ipad')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button variant="outline" size="icon" className="border-2 border-purple-300 hover:bg-purple-100">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - All Settings */}
        <div className="space-y-6">
          {/* Consolidated Settings Card */}
          <Card className="shadow-md">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 rounded bg-orange-100 text-orange-700">⚙️</div>
                Slide Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Basic Settings Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Basic Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display_order" className="text-sm font-medium">Display Order</Label>
                    <Input
                      id="display_order"
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                      className="border-2 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slide_duration_seconds" className="text-sm font-medium">Duration (seconds)</Label>
                    <Input
                      id="slide_duration_seconds"
                      type="number"
                      min="1"
                      max="30"
                      value={formData.slide_duration_seconds}
                      onChange={(e) => setFormData(prev => ({ ...prev, slide_duration_seconds: parseInt(e.target.value) || 5 }))}
                      className="border-2 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active" className="text-sm font-medium">Active Slide</Label>
                </div>
              </div>

              {/* Text Positioning Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Text Positioning</h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Title Settings */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-cyan-700">Title Settings</Label>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Horizontal</Label>
                          <Select 
                            value={formData.title_position_horizontal} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, title_position_horizontal: value }))}
                          >
                            <SelectTrigger className="border-2 focus:border-primary h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Vertical</Label>
                          <Select 
                            value={formData.title_position_vertical} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, title_position_vertical: value }))}
                          >
                            <SelectTrigger className="border-2 focus:border-primary h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top">Top</SelectItem>
                              <SelectItem value="middle">Middle</SelectItem>
                              <SelectItem value="bottom">Bottom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Size</Label>
                        <Select 
                          value={formData.title_size} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, title_size: value }))}
                        >
                          <SelectTrigger className="border-2 focus:border-primary h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                            <SelectItem value="xl">Extra Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Description Settings */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-teal-700">Description Settings</Label>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Horizontal</Label>
                          <Select 
                            value={formData.description_position_horizontal} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, description_position_horizontal: value }))}
                          >
                            <SelectTrigger className="border-2 focus:border-primary h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Vertical</Label>
                          <Select 
                            value={formData.description_position_vertical} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, description_position_vertical: value }))}
                          >
                            <SelectTrigger className="border-2 focus:border-primary h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top">Top</SelectItem>
                              <SelectItem value="middle">Middle</SelectItem>
                              <SelectItem value="bottom">Bottom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Size</Label>
                        <Select 
                          value={formData.description_size} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, description_size: value }))}
                        >
                          <SelectTrigger className="border-2 focus:border-primary h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                            <SelectItem value="xl">Extra Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Action Button</h4>
                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border">
                  <Switch
                    id="action_button_enabled"
                    checked={formData.action_button_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, action_button_enabled: checked }))}
                  />
                  <Label htmlFor="action_button_enabled" className="text-sm font-medium">Enable Action Button</Label>
                </div>
                
                {formData.action_button_enabled && (
                  <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="space-y-2">
                      <Label htmlFor="action_button_text" className="text-sm font-medium">Button Text</Label>
                      <Input
                        id="action_button_text"
                        value={formData.action_button_text}
                        onChange={(e) => setFormData(prev => ({ ...prev, action_button_text: e.target.value }))}
                        placeholder="Button text"
                        className="border-2 border-red-300 focus:border-red-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="action_button_url" className="text-sm font-medium">Button URL</Label>
                      <Input
                        id="action_button_url"
                        value={formData.action_button_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, action_button_url: e.target.value }))}
                        placeholder="https://example.com"
                        className="border-2 border-red-300 focus:border-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Actions */}
          <Card className="shadow-md border-2 border-primary/30">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? "Saving..." : editingId ? "Update Slide" : "Create Slide"}
                </Button>
                {editingId && (
                  <Button 
                    variant="outline" 
                    onClick={resetForm}
                    className="w-full h-10 border-2"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Existing Slides */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="text-xl flex items-center gap-3">
            <div className="p-2 rounded bg-slate-100 text-slate-700">📋</div>
            Existing Hero Slides
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {heroSlides.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-lg text-muted-foreground">No hero slides found</p>
              <p className="text-sm text-muted-foreground">Create your first one above to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {heroSlides.map((slide) => (
                <Card key={slide.id} className="shadow-sm border-2 hover:border-primary/30 transition-colors">
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
                            {/* Mobile Image */}
                            {slide.mobile_image_url && (
                              <div className="relative">
                                <img
                                  src={slide.mobile_image_url}
                                  alt="Mobile preview"
                                  className="w-8 h-12 object-cover rounded border-2 border-green-200"
                                  onError={(e) => {
                                    e.currentTarget.src = slide.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";
                                  }}
                                />
                                <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded-full font-bold text-[8px]">
                                  📱
                                </div>
                              </div>
                            )}
                            
                            {/* iPad Image */}
                            {slide.ipad_image_url && (
                              <div className="relative">
                                <img
                                  src={slide.ipad_image_url}
                                  alt="iPad preview"
                                  className="w-14 h-10 object-cover rounded border-2 border-purple-200"
                                  onError={(e) => {
                                    e.currentTarget.src = slide.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";
                                  }}
                                />
                                <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs px-1 py-0.5 rounded-full font-bold text-[8px]">
                                  📄
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg truncate">
                            {slide.title || <span className="text-muted-foreground italic">Untitled Slide</span>}
                          </h3>
                          <div className="flex items-center gap-1">
                            {slide.is_active ? (
                              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                                <Eye className="h-3 w-3" />
                                Active
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs font-bold">
                                <EyeOff className="h-3 w-3" />
                                Inactive
                              </div>
                            )}
                            {slide.link_url && (
                              <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                                <ExternalLink className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </div>
                        {slide.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{slide.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="bg-slate-100 px-2 py-1 rounded">Order: {slide.display_order || 0}</span>
                          <span className="bg-slate-100 px-2 py-1 rounded">Duration: {slide.slide_duration_seconds || 5}s</span>
                          {slide.button_text && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Button: {slide.button_text}</span>}
                        </div>
                      </div>
                      
                      {/* Actions Section */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          variant={slide.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleActive(slide.id, slide.is_active)}
                          className="h-8"
                        >
                          {slide.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(slide)}
                          className="h-8 border-2 hover:border-primary"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(slide.id)}
                          className="h-8"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
