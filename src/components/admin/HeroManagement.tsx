import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Upload, Save, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HeroSetting {
  id: string;
  title: string;
  subtitle: string | null;
  background_image_url: string | null;
  overlay_opacity: number | null;
  text_color: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const HeroManagement = () => {
  const [heroSettings, setHeroSettings] = useState<HeroSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    background_image_url: "",
    overlay_opacity: 0.5,
    text_color: "#ffffff",
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    fetchHeroSettings();
  }, []);

  const fetchHeroSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_hero_settings')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setHeroSettings(data || []);
    } catch (error) {
      console.error('Error fetching hero settings:', error);
      toast({
        title: "Error",
        description: "Failed to load hero settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-${Date.now()}.${fileExt}`;
      const filePath = `hero-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, background_image_url: publicUrl }));
      
      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('gw_hero_settings')
          .update({
            title: formData.title,
            subtitle: formData.subtitle || null,
            background_image_url: formData.background_image_url || null,
            overlay_opacity: formData.overlay_opacity,
            text_color: formData.text_color,
            is_active: formData.is_active,
            display_order: formData.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('gw_hero_settings')
          .insert({
            title: formData.title,
            subtitle: formData.subtitle || null,
            background_image_url: formData.background_image_url || null,
            overlay_opacity: formData.overlay_opacity,
            text_color: formData.text_color,
            is_active: formData.is_active,
            display_order: formData.display_order
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: editingId ? "Hero setting updated" : "Hero setting created"
      });

      resetForm();
      fetchHeroSettings();
    } catch (error) {
      console.error('Error saving hero setting:', error);
      toast({
        title: "Error",
        description: "Failed to save hero setting",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (setting: HeroSetting) => {
    setFormData({
      title: setting.title,
      subtitle: setting.subtitle || "",
      background_image_url: setting.background_image_url || "",
      overlay_opacity: setting.overlay_opacity || 0.5,
      text_color: setting.text_color || "#ffffff",
      is_active: setting.is_active,
      display_order: setting.display_order
    });
    setEditingId(setting.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hero setting?')) return;

    try {
      const { error } = await supabase
        .from('gw_hero_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Hero setting deleted"
      });

      fetchHeroSettings();
    } catch (error) {
      console.error('Error deleting hero setting:', error);
      toast({
        title: "Error",
        description: "Failed to delete hero setting",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_hero_settings')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      fetchHeroSettings();
      toast({
        title: "Success",
        description: `Hero ${!currentStatus ? 'activated' : 'deactivated'}`
      });
    } catch (error) {
      console.error('Error toggling hero status:', error);
      toast({
        title: "Error",
        description: "Failed to update hero status",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      background_image_url: "",
      overlay_opacity: 0.5,
      text_color: "#ffffff",
      is_active: true,
      display_order: 0
    });
    setEditingId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hero Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading hero settings...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? "Edit Hero Setting" : "Create New Hero Setting"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Hero title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Hero subtitle"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background_image">Background Image</Label>
            <div className="flex gap-2">
              <Input
                id="background_image"
                value={formData.background_image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, background_image_url: e.target.value }))}
                placeholder="Image URL or upload below"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="text_color">Text Color</Label>
              <Input
                id="text_color"
                type="color"
                value={formData.text_color}
                onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Overlay Opacity: {Math.round(formData.overlay_opacity * 100)}%</Label>
              <Slider
                value={[formData.overlay_opacity]}
                onValueChange={(value) => setFormData(prev => ({ ...prev, overlay_opacity: value[0] }))}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Hero Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {heroSettings.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hero settings found. Create your first one above.
            </p>
          ) : (
            <div className="space-y-4">
              {heroSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{setting.title}</h3>
                      {setting.is_active ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    {setting.subtitle && (
                      <p className="text-sm text-muted-foreground">{setting.subtitle}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      Order: {setting.display_order} | 
                      Color: {setting.text_color} | 
                      Opacity: {Math.round((setting.overlay_opacity || 0) * 100)}%
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(setting.id, setting.is_active)}
                    >
                      {setting.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(setting)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(setting.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};