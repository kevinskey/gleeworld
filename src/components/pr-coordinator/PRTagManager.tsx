import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PRImageTag } from '@/hooks/usePRImages';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Save, X, Tag, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PRTagManagerProps {
  tags: PRImageTag[];
  onTagsUpdate: () => void;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#6366f1', // indigo
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
];

export const PRTagManager = ({ tags, onTagsUpdate }: PRTagManagerProps) => {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0]);
  const [editingTag, setEditingTag] = useState<PRImageTag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('pr_image_tags')
        .insert({
          name: newTagName.trim(),
          color: newTagColor,
        });

      if (error) throw error;

      setNewTagName('');
      setNewTagColor(DEFAULT_COLORS[0]);
      onTagsUpdate();
      
      toast({
        title: "Success",
        description: "Tag created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create tag",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditTag = (tag: PRImageTag) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !editName.trim()) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('pr_image_tags')
        .update({
          name: editName.trim(),
          color: editColor,
        })
        .eq('id', editingTag.id);

      if (error) throw error;

      setEditingTag(null);
      setEditName('');
      setEditColor('');
      onTagsUpdate();
      
      toast({
        title: "Success",
        description: "Tag updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update tag",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this tag? This will remove it from all images.'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('pr_image_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      onTagsUpdate();
      
      toast({
        title: "Success",
        description: "Tag deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tag",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setEditName('');
    setEditColor('');
  };

  return (
    <div className="space-y-6">
      {/* Create New Tag */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Tag
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="tagName">Tag Name</Label>
              <Input
                id="tagName"
                placeholder="Enter tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newTagColor === color ? 'border-foreground' : 'border-muted'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge style={{ backgroundColor: newTagColor, color: 'white' }}>
              {newTagName || 'Preview'}
            </Badge>
            
            <Button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || isCreating}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {isCreating ? 'Creating...' : 'Create Tag'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Existing Tags ({tags.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <div className="text-center py-8">
              <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tags created yet</h3>
              <p className="text-muted-foreground">
                Create your first tag above to start organizing your PR images
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  {editingTag?.id === tag.id ? (
                    // Edit Mode
                    <div className="flex items-center gap-3 flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="max-w-xs"
                      />
                      
                      <div className="flex gap-1">
                        {DEFAULT_COLORS.map((color) => (
                          <button
                            key={color}
                            className={`w-6 h-6 rounded-full border ${
                              editColor === color ? 'border-foreground' : 'border-muted'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditColor(color)}
                          />
                        ))}
                      </div>

                      <Badge style={{ backgroundColor: editColor, color: 'white' }}>
                        {editName || 'Preview'}
                      </Badge>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleUpdateTag}
                          disabled={!editName.trim() || isUpdating}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-center gap-3">
                        <Badge style={{ backgroundColor: tag.color, color: 'white' }}>
                          {tag.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Created {new Date(tag.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTag(tag)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
