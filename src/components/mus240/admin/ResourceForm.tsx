import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, Link, File } from 'lucide-react';
import { useCreateMus240Resource, useUpdateMus240Resource, type Mus240Resource } from '@/integrations/supabase/hooks/useMus240Resources';
import { useFileUpload } from '@/integrations/supabase/hooks/useFileUpload';
import { toast } from 'sonner';

interface ResourceFormProps {
  resource?: Mus240Resource;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ResourceForm({ resource, onSuccess, onCancel }: ResourceFormProps) {
  const [resourceType, setResourceType] = useState<'url' | 'file'>(
    resource?.is_file_upload ? 'file' : 'url'
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const { uploadFile, uploading } = useFileUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-set title from filename if empty
      if (!formData.title) {
        setFormData({ ...formData, title: file.name.replace(/\.[^/.]+$/, '') });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let resourceData: any = { ...formData };

      if (resourceType === 'file' && selectedFile) {
        // Upload file first
        const fileUrl = await uploadFile(selectedFile, 'mus240-resources');
        if (!fileUrl) {
          toast.error('Failed to upload file');
          return;
        }

        resourceData = {
          ...resourceData,
          url: fileUrl,
          file_path: selectedFile.name,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          is_file_upload: true,
        };
      } else if (resourceType === 'url') {
        resourceData = {
          ...resourceData,
          is_file_upload: false,
        };
      }

      if (resource) {
        await updateMutation.mutateAsync({ 
          id: resource.id, 
          ...resourceData 
        });
        toast.success('Resource updated successfully');
      } else {
        if (resourceType === 'file' && !selectedFile) {
          toast.error('Please select a file to upload');
          return;
        }
        await createMutation.mutateAsync(resourceData);
        toast.success('Resource created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error('Failed to save resource');
      console.error('Error saving resource:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || uploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="space-y-3">
        <Label>Resource Type</Label>
        <RadioGroup
          value={resourceType}
          onValueChange={(value: 'url' | 'file') => setResourceType(value)}
          className="flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="url" id="url" />
            <Label htmlFor="url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              External Link
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="file" id="file" />
            <Label htmlFor="file" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              File Upload
            </Label>
          </div>
        </RadioGroup>
      </div>

      {resourceType === 'url' ? (
        <div className="space-y-2">
          <Label htmlFor="url-input">URL</Label>
          <Input
            id="url-input"
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://example.com"
            required
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>File Upload</Label>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
            />
            {selectedFile ? (
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change File
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  PDF, DOC, TXT, PPT, XLS files up to 10MB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select File
                </Button>
              </div>
            )}
          </div>
          {resource?.is_file_upload && (
            <p className="text-xs text-muted-foreground">
              Current file: {resource.file_name}
            </p>
          )}
        </div>
      )}

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