import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ModuleResourceManagerProps {
  courseId: string;
  moduleId: string;
  weekNumber: number;
  onClose: () => void;
}

export const ModuleResourceManager: React.FC<ModuleResourceManagerProps> = ({
  courseId,
  moduleId,
  weekNumber,
  onClose,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [resourceType, setResourceType] = useState('video');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      // Add to mus240_module_resources using week-N format
      const { error } = await supabase
        .from('mus240_module_resources')
        .insert({
          module_id: `week-${weekNumber}`,
          title: title.trim(),
          url: url.trim() || null,
          resource_type: resourceType,
          description: description.trim() || null,
          display_order: 0,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success('Resource added');
      queryClient.invalidateQueries({ queryKey: ['mus240-module-resources'] });
      setTitle('');
      setUrl('');
      setDescription('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add resource');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Add Resource to Week {weekNumber}</h4>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          placeholder="Resource title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="reading">Reading</SelectItem>
            <SelectItem value="listening">Listening</SelectItem>
            <SelectItem value="document">Document</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input
        placeholder="URL (YouTube, article link, etc.)"
        value={url}
        onChange={e => setUrl(e.target.value)}
      />
      <Input
        placeholder="Description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <Button size="sm" onClick={handleAdd} disabled={saving}>
        <Plus className="h-4 w-4 mr-1.5" /> Add Resource
      </Button>
    </div>
  );
};
