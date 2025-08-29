import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateMus240Resource, useUpdateMus240Resource, type Mus240Resource } from '@/integrations/supabase/hooks/useMus240Resources';
import { toast } from 'sonner';

interface ResourceFormProps {
  resource?: Mus240Resource;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ResourceForm({ resource, onSuccess, onCancel }: ResourceFormProps) {
  const [formData, setFormData] = useState({
    title: resource?.title || '',
    url: resource?.url || '',
    description: resource?.description || '',
    category: resource?.category || 'website' as const,
    is_active: resource?.is_active ?? true,
    display_order: resource?.display_order || 0,
  });

  const createMutation = useCreateMus240Resource();
  const updateMutation = useUpdateMus240Resource();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (resource) {
        await updateMutation.mutateAsync({ 
          id: resource.id, 
          ...formData 
        });
        toast.success('Resource updated successfully');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Resource created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error('Failed to save resource');
      console.error('Error saving resource:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Resource title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe this resource..."
          required
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as any })}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reading">Reading</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="article">Article</SelectItem>
            <SelectItem value="database">Database</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display_order">Display Order</Label>
        <Input
          id="display_order"
          type="number"
          value={formData.display_order}
          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
          placeholder="0"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : resource ? 'Update' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}