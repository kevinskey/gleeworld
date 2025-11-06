import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, X, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUploadImage } from '@/hooks/useMediaLibrary';

interface ItemEditorProps {
  item: any;
  onSave: () => void;
  onCancel: () => void;
}

export const ItemEditor = ({ item, onSave, onCancel }: ItemEditorProps) => {
  const [formData, setFormData] = useState(item);
  const uploadImage = useUploadImage();

  const handleSave = async () => {
    try {
      if (formData.id) {
        // Update
        const { error } = await supabase
          .from('alumnae_section_items')
          .update({
            item_type: formData.item_type,
            title: formData.title,
            content: formData.content,
            media_url: formData.media_url,
            link_url: formData.link_url,
            link_target: formData.link_target,
            column_position: formData.column_position,
            width_percentage: formData.width_percentage,
            is_active: formData.is_active,
            settings: formData.settings,
          })
          .eq('id', formData.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('alumnae_section_items')
          .insert([{
            section_id: formData.section_id,
            item_type: formData.item_type,
            title: formData.title,
            content: formData.content,
            media_url: formData.media_url,
            link_url: formData.link_url,
            link_target: formData.link_target,
            column_position: formData.column_position,
            sort_order: formData.sort_order,
            width_percentage: formData.width_percentage,
            is_active: formData.is_active,
            settings: formData.settings,
          }]);

        if (error) throw error;
      }

      toast.success('Item saved');
      onSave();
    } catch (error: any) {
      toast.error('Failed to save item: ' + error.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadImage.mutateAsync({ file, description: formData.title || '' });
      if (result.file_url) {
        setFormData({ ...formData, media_url: result.file_url });
        toast.success('File uploaded');
      }
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{formData.id ? 'Edit Item' : 'Add Item'}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Item Type</Label>
          <Select value={formData.item_type} onValueChange={(value) => setFormData({ ...formData, item_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="audio">Audio (MP3)</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="link">Link</SelectItem>
              <SelectItem value="form">Form</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        {['text', 'form'].includes(formData.item_type) && (
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={formData.content || ''}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
            />
          </div>
        )}

        {['image', 'video', 'audio', 'pdf'].includes(formData.item_type) && (
          <>
            <div className="space-y-2">
              <Label>Media URL</Label>
              <Input
                value={formData.media_url || ''}
                onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                placeholder="https://... or upload below"
              />
            </div>
            <div className="space-y-2">
              <Label>Upload File</Label>
              <Input type="file" onChange={handleFileUpload} accept={
                formData.item_type === 'image' ? 'image/*' :
                formData.item_type === 'video' ? 'video/*' :
                formData.item_type === 'audio' ? 'audio/*' : '.pdf'
              } />
            </div>
          </>
        )}

        {formData.item_type === 'link' && (
          <>
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                value={formData.link_url || ''}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Link Target</Label>
              <Select value={formData.link_target} onValueChange={(value) => setFormData({ ...formData, link_target: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal (same tab)</SelectItem>
                  <SelectItem value="external">External (new tab)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Column Position</Label>
            <Input
              type="number"
              min="1"
              max="3"
              value={formData.column_position}
              onChange={(e) => setFormData({ ...formData, column_position: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Width %</Label>
            <Input
              type="number"
              min="10"
              max="100"
              step="10"
              value={formData.width_percentage}
              onChange={(e) => setFormData({ ...formData, width_percentage: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label>Active</Label>
        </div>
      </CardContent>
    </Card>
  );
};
