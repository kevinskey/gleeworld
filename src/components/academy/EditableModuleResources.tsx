import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  Video, 
  FileText, 
  Music, 
  CheckCircle2, 
  Clock, 
  Play, 
  ExternalLink,
  Headphones,
  Plus,
  Trash2,
  Save,
  Loader2,
  Edit2,
  X,
  GripVertical
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ModuleResource {
  id: string;
  title: string;
  resource_type: string;
  url?: string;
  duration?: string;
  description?: string;
  is_completed?: boolean;
  sort_order: number;
  user_id?: string;
}

interface EditableModuleResourcesProps {
  moduleId: string;
  isLocked?: boolean;
}

const RESOURCE_TYPES = [
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'audio', label: 'Audio', icon: Music },
  { value: 'reading', label: 'Reading', icon: BookOpen },
];

const getResourceIcon = (type: string) => {
  const found = RESOURCE_TYPES.find(t => t.value === type);
  return found?.icon || FileText;
};

const getResourceColor = (type: string) => {
  switch (type) {
    case 'video': return 'text-purple-600';
    case 'audio': return 'text-blue-600';
    case 'reading': return 'text-green-600';
    case 'document': return 'text-amber-600';
    default: return 'text-muted-foreground';
  }
};

const EditableModuleResources: React.FC<EditableModuleResourcesProps> = ({ 
  moduleId, 
  isLocked = false 
}) => {
  const { user } = useAuth();
  const [resources, setResources] = useState<ModuleResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New resource form state
  const [newResource, setNewResource] = useState({
    title: '',
    resource_type: 'document',
    url: '',
    duration: '',
    description: ''
  });

  // Fetch resources
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const { data, error } = await supabase
          .from('lh100_module_resources')
          .select('*')
          .eq('module_id', moduleId)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setResources(data || []);
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [moduleId]);

  const handleAddResource = async () => {
    if (!user?.id || !newResource.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('lh100_module_resources')
        .insert({
          module_id: moduleId,
          user_id: user.id,
          title: newResource.title,
          resource_type: newResource.resource_type,
          url: newResource.url || null,
          duration: newResource.duration || null,
          description: newResource.description || null,
          sort_order: resources.length
        })
        .select()
        .single();

      if (error) throw error;

      setResources(prev => [...prev, data]);
      setNewResource({
        title: '',
        resource_type: 'document',
        url: '',
        duration: '',
        description: ''
      });
      setShowAddForm(false);
      toast.success('Resource added');
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error('Failed to add resource');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateResource = async (resource: ModuleResource) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lh100_module_resources')
        .update({
          title: resource.title,
          resource_type: resource.resource_type,
          url: resource.url,
          duration: resource.duration,
          description: resource.description
        })
        .eq('id', resource.id);

      if (error) throw error;

      setEditingId(null);
      toast.success('Resource updated');
    } catch (error) {
      console.error('Error updating resource:', error);
      toast.error('Failed to update resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const { error } = await supabase
        .from('lh100_module_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Resource deleted');
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  const toggleComplete = async (resource: ModuleResource) => {
    try {
      const { error } = await supabase
        .from('lh100_module_resources')
        .update({ is_completed: !resource.is_completed })
        .eq('id', resource.id);

      if (error) throw error;

      setResources(prev => prev.map(r => 
        r.id === resource.id ? { ...r, is_completed: !r.is_completed } : r
      ));
    } catch (error) {
      console.error('Error toggling complete:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Module Resources
        </h4>
        {user && !isLocked && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-7 text-xs"
          >
            {showAddForm ? (
              <>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-3 w-3 mr-1" />
                Add Resource
              </>
            )}
          </Button>
        )}
      </div>

      {/* Add Resource Form */}
      {showAddForm && (
        <div className="p-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Resource title..."
              value={newResource.title}
              onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
              className="h-8 text-sm"
            />
            <Select 
              value={newResource.resource_type} 
              onValueChange={(v) => setNewResource(prev => ({ ...prev, resource_type: v }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="URL (optional)"
              value={newResource.url}
              onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value }))}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Duration (e.g., 15 min)"
              value={newResource.duration}
              onChange={(e) => setNewResource(prev => ({ ...prev, duration: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <Input
            placeholder="Description (optional)"
            value={newResource.description}
            onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
            className="h-8 text-sm"
          />
          <Button 
            size="sm" 
            onClick={handleAddResource}
            disabled={saving || !newResource.title.trim()}
            className="w-full h-8"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Resource
          </Button>
        </div>
      )}

      {/* Resources List */}
      <div className="grid gap-2">
        {resources.length === 0 && !showAddForm ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No resources yet. {user && 'Click "Add Resource" to create one.'}
          </div>
        ) : (
          resources.map((resource) => {
            const Icon = getResourceIcon(resource.resource_type);
            const colorClass = getResourceColor(resource.resource_type);
            const isEditing = editingId === resource.id;

            if (isEditing) {
              return (
                <div key={resource.id} className="p-3 rounded-lg border border-primary bg-primary/5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={resource.title}
                      onChange={(e) => setResources(prev => prev.map(r => 
                        r.id === resource.id ? { ...r, title: e.target.value } : r
                      ))}
                      className="h-8 text-sm"
                    />
                    <Select 
                      value={resource.resource_type} 
                      onValueChange={(v) => setResources(prev => prev.map(r => 
                        r.id === resource.id ? { ...r, resource_type: v } : r
                      ))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="URL"
                      value={resource.url || ''}
                      onChange={(e) => setResources(prev => prev.map(r => 
                        r.id === resource.id ? { ...r, url: e.target.value } : r
                      ))}
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder="Duration"
                      value={resource.duration || ''}
                      onChange={(e) => setResources(prev => prev.map(r => 
                        r.id === resource.id ? { ...r, duration: e.target.value } : r
                      ))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateResource(resource)}
                      disabled={saving}
                      className="h-7"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={resource.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  resource.is_completed 
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30' 
                    : 'bg-background hover:bg-muted/50'
                }`}
              >
                <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{resource.title}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {resource.resource_type}
                    </Badge>
                  </div>
                  {resource.duration && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {resource.duration}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {user && !isLocked && (
                    <>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setEditingId(resource.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteResource(resource.id)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {resource.is_completed ? (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => toggleComplete(resource)}
                      className="h-7 w-7 p-0"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => resource.url ? window.open(resource.url, '_blank') : toggleComplete(resource)}
                      className="h-8 px-3"
                    >
                      {resource.resource_type === 'video' ? (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          Watch
                        </>
                      ) : resource.resource_type === 'audio' ? (
                        <>
                          <Headphones className="h-3 w-3 mr-1" />
                          Listen
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EditableModuleResources;
