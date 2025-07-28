import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save, Trash2, Eye, EyeOff, ExternalLink, Edit } from "lucide-react";
import { Slider } from "@/components/ui/slider";
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
  const [usageContext, setUsageContext] = useState<'homepage' | 'press_kit'>('homepage');
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
  }, [usageContext]);

  const fetchHeroSlides = async () => {
    try {
      const { data: slidesData, error: slidesError } = await supabase
        .from('gw_hero_slides')
        .select('*')
        .eq('usage_context', usageContext)
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
            is_active: formData.is_active,
            usage_context: usageContext
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
    <div className="space-y-6">
      {/* Usage Context Tabs */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="text-xl md:text-2xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              🎨
            </div>
            <span>Hero Slide Management</span>
          </CardTitle>
          <div className="flex gap-2 mt-4">
            <Button
              variant={usageContext === 'homepage' ? 'default' : 'outline'}
              onClick={() => setUsageContext('homepage')}
              className="text-sm"
            >
              🏠 Homepage Slides
            </Button>
            <Button
              variant={usageContext === 'press_kit' ? 'default' : 'outline'}
              onClick={() => setUsageContext('press_kit')}
              className="text-sm"
            >
              📰 Press Kit Slides
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Header */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="text-xl md:text-2xl flex items-center gap-3">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {editingId ? '✏️' : '➕'}
            </div>
            <span className="hidden sm:inline">{editingId ? "Edit" : "Create New"} {usageContext === 'press_kit' ? 'Press Kit' : 'Homepage'} Slide</span>
            <span className="sm:hidden">{editingId ? "Edit" : "New"} {usageContext === 'press_kit' ? 'Press Kit' : 'Homepage'} Slide</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Content Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Content & Text */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1 rounded bg-blue-100 text-blue-700 text-sm">📝</div>
                Content & Text
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Slide title"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="button_text" className="text-sm">Button Text</Label>
                  <Input
                    id="button_text"
                    value={formData.button_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                    placeholder="Button text"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_url" className="text-sm">Link URL</Label>
                <Input
                  id="link_url"
                  value={formData.link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  placeholder="https://example.com"
                  className="h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1 rounded bg-purple-100 text-purple-700 text-sm">🖼️</div>
                Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Desktop */}
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-0.5 rounded bg-blue-500 text-white text-xs">🖥️</div>
                    <Label className="text-xs font-medium text-blue-800">Desktop *</Label>
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="Image URL"
                      className="h-8 text-xs"
                    />
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'desktop')}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mobile */}
                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-0.5 rounded bg-green-500 text-white text-xs">📱</div>
                    <Label className="text-xs font-medium text-green-800">Mobile</Label>
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={formData.mobile_image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobile_image_url: e.target.value }))}
                      placeholder="Image URL"
                      className="h-8 text-xs"
                    />
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'mobile')}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>

                {/* iPad */}
                <div className="p-3 bg-purple-50 rounded border border-purple-200 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-0.5 rounded bg-purple-500 text-white text-xs">📄</div>
                    <Label className="text-xs font-medium text-purple-800">iPad</Label>
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={formData.ipad_image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, ipad_image_url: e.target.value }))}
                      placeholder="Image URL"
                      className="h-8 text-xs"
                    />
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'ipad')}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Cockpit */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-4">
            {/* Quick Actions */}
            <Card className="shadow-sm border-2 border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="w-full h-8 text-sm"
                  size="sm"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </Button>
                {editingId && (
                  <Button 
                    variant="outline" 
                    onClick={resetForm}
                    className="w-full h-8 text-sm"
                    size="sm"
                  >
                    Cancel
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Basic Settings */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="p-1 rounded bg-orange-100 text-orange-700 text-xs">⚙️</div>
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Order: {formData.display_order}</Label>
                  <Slider
                    value={[formData.display_order]}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, display_order: value[0] }))}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Duration: {formData.slide_duration_seconds}s</Label>
                  <Slider
                    value={[formData.slide_duration_seconds]}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, slide_duration_seconds: value[0] }))}
                    min={1}
                    max={15}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active" className="text-xs">Active</Label>
                </div>
              </CardContent>
            </Card>

            {/* Text Position */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Text Position</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-cyan-700">Title</Label>
                  <div className="grid grid-cols-2 gap-1">
                    <Select 
                      value={formData.title_position_horizontal} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, title_position_horizontal: value }))}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        <SelectItem value="left">L</SelectItem>
                        <SelectItem value="center">C</SelectItem>
                        <SelectItem value="right">R</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={formData.title_position_vertical} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, title_position_vertical: value }))}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        <SelectItem value="top">T</SelectItem>
                        <SelectItem value="middle">M</SelectItem>
                        <SelectItem value="bottom">B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select 
                    value={formData.title_size} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, title_size: value }))}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="xl">XL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-teal-700">Description</Label>
                  <div className="grid grid-cols-2 gap-1">
                    <Select 
                      value={formData.description_position_horizontal} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, description_position_horizontal: value }))}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        <SelectItem value="left">L</SelectItem>
                        <SelectItem value="center">C</SelectItem>
                        <SelectItem value="right">R</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={formData.description_position_vertical} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, description_position_vertical: value }))}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        <SelectItem value="top">T</SelectItem>
                        <SelectItem value="middle">M</SelectItem>
                        <SelectItem value="bottom">B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select 
                    value={formData.description_size} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, description_size: value }))}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="xl">XL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Action Button */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Action Button</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded">
                  <Switch
                    id="action_button_enabled"
                    checked={formData.action_button_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, action_button_enabled: checked }))}
                  />
                  <Label htmlFor="action_button_enabled" className="text-xs">Enable</Label>
                </div>
                {formData.action_button_enabled && (
                  <div className="space-y-2">
                    <Input
                      value={formData.action_button_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, action_button_text: e.target.value }))}
                      placeholder="Button text"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={formData.action_button_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, action_button_url: e.target.value }))}
                      placeholder="Button URL"
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                                  className="w-12 h-8 object-cover rounded border border-green-200"
                                  onError={(e) => {
                                    e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";
                                  }}
                                />
                                <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded-full font-bold">
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
                                  className="w-12 h-8 object-cover rounded border border-purple-200"
                                  onError={(e) => {
                                    e.currentTarget.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";
                                  }}
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
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {slide.description}
                                </p>
                              )}
                              {slide.link_url && (
                                <a 
                                  href={slide.link_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {slide.link_url}
                                </a>
                              )}
                            </div>
                            
                            {/* Status Badge */}
                            <div className="flex items-center gap-2 ml-4">
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${slide.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {slide.is_active ? 'Active' : 'Inactive'}
                              </div>
                              <div className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-mono">
                                #{slide.display_order}
                              </div>
                            </div>
                          </div>

                          {/* Metadata Row */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                            <span className="flex items-center gap-1">
                              ⏱️ {slide.slide_duration_seconds}s
                            </span>
                            <span className="flex items-center gap-1">
                              📍 {slide.title_position_horizontal} / {slide.title_position_vertical}
                            </span>
                            <span className="flex items-center gap-1">
                              🔤 {slide.title_size}
                            </span>
                            {slide.action_button_enabled && (
                              <span className="flex items-center gap-1">
                                🔘 Action Button
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions Section */}
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(slide)}
                          className="h-8 px-3 text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
