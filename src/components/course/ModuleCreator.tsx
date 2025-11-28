import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FolderOpen, Trash2, GripVertical, FileText, Video, ClipboardList, Link as LinkIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ModuleCreatorProps {
  courseId: string;
}

export const ModuleCreator: React.FC<ModuleCreatorProps> = ({ courseId }) => {
  const queryClient = useQueryClient();
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    is_published: false,
    display_order: 1
  });
  const [moduleItems, setModuleItems] = useState<Array<{
    title: string;
    item_type: string;
    content_text?: string;
    content_url?: string;
    points?: number;
    display_order: number;
  }>>([]);

  const createModuleMutation = useMutation({
    mutationFn: async () => {
      // First create the module
      const { data: module, error: moduleError } = await supabase
        .from('course_modules')
        .insert({
          course_id: courseId,
          title: newModule.title,
          description: newModule.description,
          is_published: newModule.is_published,
          display_order: newModule.display_order
        })
        .select()
        .single();

      if (moduleError) throw moduleError;

      // Then create the module items
      if (moduleItems.length > 0 && module) {
        const itemsWithModuleId = moduleItems.map(item => ({
          ...item,
          module_id: module.id
        }));

        const { error: itemsError } = await supabase
          .from('module_items')
          .insert(itemsWithModuleId);

        if (itemsError) throw itemsError;
      }

      return module;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
      setNewModule({ title: '', description: '', is_published: false, display_order: 1 });
      setModuleItems([]);
      toast.success('Module created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create module');
      console.error(error);
    }
  });

  const addModuleItem = () => {
    setModuleItems([
      ...moduleItems,
      {
        title: '',
        item_type: 'document',
        content_text: '',
        display_order: moduleItems.length + 1
      }
    ]);
  };

  const updateModuleItem = (index: number, field: string, value: any) => {
    const updated = [...moduleItems];
    updated[index] = { ...updated[index], [field]: value };
    setModuleItems(updated);
  };

  const removeModuleItem = (index: number) => {
    setModuleItems(moduleItems.filter((_, i) => i !== index));
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'document': return FileText;
      case 'assignment': return ClipboardList;
      case 'link': return LinkIcon;
      default: return FileText;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Create New Module
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="module-title">Module Title *</Label>
            <Input
              id="module-title"
              placeholder="e.g., Week 1: Introduction to Conducting"
              value={newModule.title}
              onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="module-description">Description</Label>
            <Textarea
              id="module-description"
              placeholder="Brief description of this module..."
              rows={3}
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="module-published"
                checked={newModule.is_published}
                onCheckedChange={(checked) => setNewModule({ ...newModule, is_published: checked })}
              />
              <Label htmlFor="module-published">Publish immediately</Label>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="display-order">Display Order:</Label>
              <Input
                id="display-order"
                type="number"
                min={1}
                className="w-20"
                value={newModule.display_order}
                onChange={(e) => setNewModule({ ...newModule, display_order: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Module Items</CardTitle>
            <Button onClick={addModuleItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {moduleItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No items yet. Click "Add Item" to get started.
            </p>
          ) : (
            moduleItems.map((item, index) => {
              const ItemIcon = getItemIcon(item.item_type);
              return (
                <Card key={index} className="border-2">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <ItemIcon className="h-4 w-4 text-primary" />
                          <Input
                            placeholder="Item title"
                            value={item.title}
                            onChange={(e) => updateModuleItem(index, 'title', e.target.value)}
                          />
                          <Select
                            value={item.item_type}
                            onValueChange={(value) => updateModuleItem(index, 'item_type', value)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="assignment">Assignment</SelectItem>
                              <SelectItem value="link">Link</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeModuleItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {item.item_type === 'assignment' && (
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Points"
                              className="w-32"
                              value={item.points || ''}
                              onChange={(e) => updateModuleItem(index, 'points', parseInt(e.target.value))}
                            />
                          </div>
                        )}

                        {(item.item_type === 'link' || item.item_type === 'video') && (
                          <Input
                            placeholder="URL"
                            value={item.content_url || ''}
                            onChange={(e) => updateModuleItem(index, 'content_url', e.target.value)}
                          />
                        )}

                        <Textarea
                          placeholder="Description or content..."
                          rows={2}
                          value={item.content_text || ''}
                          onChange={(e) => updateModuleItem(index, 'content_text', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setNewModule({ title: '', description: '', is_published: false, display_order: 1 });
            setModuleItems([]);
          }}
        >
          Clear All
        </Button>
        <Button
          onClick={() => createModuleMutation.mutate()}
          disabled={!newModule.title || createModuleMutation.isPending}
        >
          {createModuleMutation.isPending ? 'Creating...' : 'Create Module'}
        </Button>
      </div>
    </div>
  );
};
