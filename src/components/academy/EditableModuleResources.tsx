import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BookOpen, 
  Video, 
  FileText, 
  Music, 
  CheckCircle2, 
  Clock, 
  Play, 
  Eye,
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
import { ResourceViewer } from './ResourceViewer';

interface ModuleResource {
  id: string;
  title: string;
  resource_type: string;
  url?: string | null;
  duration?: string | null;
  description?: string | null;
  is_completed?: boolean;
  sort_order: number;
}

interface EditableModuleResourcesProps {
  moduleId: string;
  isLocked?: boolean;
}

const RESOURCE_TYPES = [
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'audio', label: 'Audio/Music', icon: Music },
  { value: 'reading', label: 'Reading', icon: BookOpen },
];

const getResourceIcon = (type: string) => {
  const found = RESOURCE_TYPES.find(t => t.value === type);
  return found?.icon || FileText;
};

const getResourceColor = (type: string) => {
  switch (type) {
    case 'video': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
    case 'audio': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    case 'reading': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'document': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
    default: return 'text-muted-foreground bg-muted';
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
  const [editForm, setEditForm] = useState<Partial<ModuleResource>>({});
  
  // Resource viewer state
  const [viewingResource, setViewingResource] = useState<ModuleResource | null>(null);
  
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
          .select('id, title, resource_type, url, duration, description, is_completed, sort_order')
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
    if (!newResource.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('lh100_module_resources')
        .insert({
          module_id: moduleId,
          user_id: user?.id || null,
          title: newResource.title.trim(),
          resource_type: newResource.resource_type,
          url: newResource.url.trim() || null,
          duration: newResource.duration.trim() || null,
          description: newResource.description.trim() || null,
          sort_order: resources.length
        })
        .select('id, title, resource_type, url, duration, description, is_completed, sort_order')
        .single();

      if (error) throw error;

      setResources(prev => [...prev, data]);
      setNewResource({ title: '', resource_type: 'document', url: '', duration: '', description: '' });
      setShowAddForm(false);
      toast.success('Resource added!');
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error('Failed to add resource');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (resource: ModuleResource) => {
    setEditingId(resource.id);
    setEditForm({
      title: resource.title,
      resource_type: resource.resource_type,
      url: resource.url || '',
      duration: resource.duration || '',
      description: resource.description || ''
    });
  };

  const handleUpdateResource = async () => {
    if (!editingId || !editForm.title?.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('lh100_module_resources')
        .update({
          title: editForm.title.trim(),
          resource_type: editForm.resource_type,
          url: editForm.url?.trim() || null,
          duration: editForm.duration?.trim() || null,
          description: editForm.description?.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;

      setResources(prev => prev.map(r => 
        r.id === editingId 
          ? { ...r, ...editForm, url: editForm.url?.trim() || null, duration: editForm.duration?.trim() || null, description: editForm.description?.trim() || null }
          : r
      ));
      setEditingId(null);
      setEditForm({});
      toast.success('Resource updated!');
    } catch (error) {
      console.error('Error updating resource:', error);
      toast.error('Failed to update resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Delete this resource?')) return;

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
      const newStatus = !resource.is_completed;
      const { error } = await supabase
        .from('lh100_module_resources')
        .update({ is_completed: newStatus })
        .eq('id', resource.id);

      if (error) throw error;

      setResources(prev => prev.map(r => 
        r.id === resource.id ? { ...r, is_completed: newStatus } : r
      ));
    } catch (error) {
      console.error('Error toggling completion:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p className="text-sm">Resources locked until module starts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Module Resources
        </h4>
        {user && !showAddForm && !editingId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Resource
          </Button>
        )}
      </div>

      {/* Add Resource Form */}
      {showAddForm && (
        <Card className="border-primary">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Resource title *"
                value={newResource.title}
                onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
              />
              <Select 
                value={newResource.resource_type} 
                onValueChange={(v) => setNewResource(prev => ({ ...prev, resource_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="URL (optional)"
                value={newResource.url}
                onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value }))}
              />
              <Input
                placeholder="Duration (e.g., 15 min)"
                value={newResource.duration}
                onChange={(e) => setNewResource(prev => ({ ...prev, duration: e.target.value }))}
              />
            </div>
            <Textarea
              placeholder="Description (optional)"
              value={newResource.description}
              onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddResource} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Resource
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)} size="sm">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resources List */}
      <div className="space-y-2">
        {resources.length === 0 && !showAddForm ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <p className="text-sm">No resources yet.</p>
            {user && <p className="text-xs mt-1">Click "Add Resource" to create one.</p>}
          </div>
        ) : (
          resources.map((resource) => {
            const Icon = getResourceIcon(resource.resource_type);
            const colorClass = getResourceColor(resource.resource_type);
            const isEditing = editingId === resource.id;

            if (isEditing) {
              return (
                <Card key={resource.id} className="border-primary">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Resource title *"
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      />
                      <Select 
                        value={editForm.resource_type || 'document'} 
                        onValueChange={(v) => setEditForm(prev => ({ ...prev, resource_type: v }))}
                      >
                        <SelectTrigger>
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
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="URL (optional)"
                        value={editForm.url || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, url: e.target.value }))}
                      />
                      <Input
                        placeholder="Duration (e.g., 15 min)"
                        value={editForm.duration || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, duration: e.target.value }))}
                      />
                    </div>
                    <Textarea
                      placeholder="Description (optional)"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateResource} disabled={saving} size="sm">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                        Save Changes
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => { setEditingId(null); setEditForm({}); }} 
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div 
                key={resource.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  resource.is_completed 
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30' 
                    : 'bg-card hover:bg-muted/50'
                }`}
              >
                {/* Icon */}
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{resource.title}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {resource.resource_type}
                    </Badge>
                  </div>
                  {resource.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {resource.description}
                    </p>
                  )}
                  {resource.duration && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {resource.duration}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Complete toggle */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => toggleComplete(resource)}
                    title={resource.is_completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    <CheckCircle2 className={`h-4 w-4 ${resource.is_completed ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </Button>

                  {/* Open URL in-app */}
                  {resource.url && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setViewingResource(resource)}
                      title="View resource"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Edit */}
                  {user && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => startEditing(resource)}
                      title="Edit resource"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Delete */}
                  {user && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteResource(resource.id)}
                      title="Delete resource"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Resource Viewer Modal */}
      <ResourceViewer
        isOpen={!!viewingResource}
        onClose={() => setViewingResource(null)}
        resource={viewingResource ? {
          title: viewingResource.title,
          url: viewingResource.url || '',
          resource_type: viewingResource.resource_type,
          description: viewingResource.description
        } : null}
      />
    </div>
  );
};

export default EditableModuleResources;
