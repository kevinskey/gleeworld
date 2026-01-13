import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save, X, Clock, LayoutGrid, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SlideFormData {
  title: string;
  description: string;
  image_url: string;
  mobile_image_url: string;
  ipad_image_url: string;
  video_url: string; // YouTube video URL
  display_order: number;
  is_active: boolean;
  // New advanced controls
  duration_ms: number | null;
  layout: 'one' | 'two' | 'three';
  transition: 'fade' | 'left' | 'right' | 'up' | 'down' | 'zoom';
}

interface SlideEditFormProps {
  formData: SlideFormData;
  setFormData: React.Dispatch<React.SetStateAction<SlideFormData>>;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  isEditing: boolean;
  showAdvancedControls?: boolean;
}

const LAYOUT_OPTIONS = [
  { value: 'one', label: '1 Column', description: 'Full-width single column' },
  { value: 'two', label: '2 Columns', description: 'Media + Text side by side' },
  { value: 'three', label: '3 Columns', description: 'Media + Text + CTA' },
];

const TRANSITION_OPTIONS = [
  { value: 'fade', label: 'Fade', icon: '✨' },
  { value: 'left', label: 'Slide Left', icon: '←' },
  { value: 'right', label: 'Slide Right', icon: '→' },
  { value: 'up', label: 'Slide Up', icon: '↑' },
  { value: 'down', label: 'Slide Down', icon: '↓' },
  { value: 'zoom', label: 'Zoom', icon: '🔍' },
];

export const SlideEditForm = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  saving,
  isEditing,
  showAdvancedControls = true,
}: SlideEditFormProps) => {
  const { toast } = useToast();

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: 'desktop' | 'mobile' | 'ipad'
  ) => {
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

  return (
    <Card className="border-2 border-primary/40 bg-primary/5 shadow-lg animate-in slide-in-from-top-2 duration-200">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <div className={`p-1.5 rounded ${isEditing ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
            {isEditing ? '✏️' : '➕'}
          </div>
          {isEditing ? 'Edit Slide' : 'Create New Slide'}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Content & Text */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm">Title (optional)</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Slide title"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description"
              rows={1}
              className="resize-none min-h-[36px]"
            />
          </div>
        </div>

        {/* YouTube Video URL */}
        <div className="p-3 bg-red-50 rounded border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-0.5 rounded bg-red-500 text-white text-xs">🎬</div>
            <Label className="text-xs font-medium text-red-800">YouTube Video (optional)</Label>
          </div>
          <Input
            value={formData.video_url}
            onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
            placeholder="YouTube URL or video ID"
            className="h-8 text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">If set, video will display instead of image</p>
        </div>

        {/* Images */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <div className="p-3 bg-purple-50 rounded border border-purple-200">
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

        {/* Advanced Controls: Timing, Layout, Transition */}
        {showAdvancedControls && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            {/* Duration Override */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <Label className="text-xs font-medium text-amber-800">Duration (ms)</Label>
              </div>
              <Input
                type="number"
                value={formData.duration_ms || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  duration_ms: e.target.value ? parseInt(e.target.value) : null 
                }))}
                placeholder="Default (6000)"
                className="h-8 text-xs"
                min={1000}
                max={60000}
                step={500}
              />
              <p className="text-xs text-muted-foreground">Leave empty for global default</p>
            </div>

            {/* Layout */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-amber-600" />
                <Label className="text-xs font-medium text-amber-800">Layout</Label>
              </div>
              <Select
                value={formData.layout}
                onValueChange={(value: 'one' | 'two' | 'three') => 
                  setFormData(prev => ({ ...prev, layout: value }))
                }
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {LAYOUT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-muted-foreground ml-1">- {opt.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transition */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <Label className="text-xs font-medium text-amber-800">Transition</Label>
              </div>
              <Select
                value={formData.transition}
                onValueChange={(value: 'fade' | 'left' | 'right' | 'up' | 'down' | 'zoom') => 
                  setFormData(prev => ({ ...prev, transition: value }))
                }
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Select transition" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {TRANSITION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <span className="mr-2">{opt.icon}</span>
                      <span className="font-medium">{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Settings Row */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Order: {formData.display_order}</Label>
            <Slider
              value={[formData.display_order]}
              onValueChange={(value) => setFormData(prev => ({ ...prev, display_order: value[0] }))}
              min={0}
              max={10}
              step={1}
              className="w-24"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="is_active_inline"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active_inline" className="text-xs">Active</Label>
          </div>
          <div className="flex-1" />
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onCancel}
              className="h-8"
            >
              Cancel
            </Button>
            <Button 
              onClick={onSave} 
              disabled={saving}
              size="sm"
              className="h-8"
            >
              <Save className="h-3 w-3 mr-1" />
              {saving ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
