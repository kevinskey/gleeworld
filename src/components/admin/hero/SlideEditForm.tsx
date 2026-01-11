import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Upload, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SlideFormData {
  title: string;
  description: string;
  image_url: string;
  mobile_image_url: string;
  ipad_image_url: string;
  display_order: number;
  is_active: boolean;
}

interface SlideEditFormProps {
  formData: SlideFormData;
  setFormData: React.Dispatch<React.SetStateAction<SlideFormData>>;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  isEditing: boolean;
}

export const SlideEditForm = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  saving,
  isEditing,
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
