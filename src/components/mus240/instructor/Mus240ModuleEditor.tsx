import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Lock, Eye, EyeOff, Plus, Trash2, Edit, Save, 
  Video, FileText, Music, BookOpen, Link, GripVertical,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ModuleSetting {
  id: string;
  module_id: string;
  title: string | null;
  description: string | null;
  is_active: boolean;
  is_locked: boolean;
  week_number: number | null;
  learning_objectives: unknown;
  semester: string;
}

interface ModuleResource {
  id: string;
  module_id: string;
  title: string;
  resource_type: string;
  url: string | null;
  description: string | null;
  duration: string | null;
  display_order: number;
  is_required: boolean;
}

const RESOURCE_TYPES = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'reading', label: 'Reading', icon: BookOpen },
  { value: 'audio', label: 'Audio', icon: Music },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'link', label: 'External Link', icon: Link },
];

export const Mus240ModuleEditor: React.FC = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleSetting[]>([]);
  const [resources, setResources] = useState<Record<string, ModuleResource[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleSetting | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addResourceDialogOpen, setAddResourceDialogOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [newResource, setNewResource] = useState({
    title: '',
    resource_type: 'video',
    url: '',
    description: '',
    duration: '',
    is_required: false
  });

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_module_settings')
        .select('*')
        .order('module_id');

      if (error) throw error;
      
      const sorted = (data || []).sort((a, b) => {
        const weekA = parseInt(a.module_id.replace('week-', ''));
        const weekB = parseInt(b.module_id.replace('week-', ''));
        return weekA - weekB;
      });
      
      setModules(sorted);
      
      // Fetch resources for all modules
      const { data: resourceData, error: resourceError } = await supabase
        .from('mus240_module_resources')
        .select('*')
        .order('display_order');
      
      if (!resourceError && resourceData) {
        const grouped: Record<string, ModuleResource[]> = {};
        resourceData.forEach(r => {
          if (!grouped[r.module_id]) grouped[r.module_id] = [];
          grouped[r.module_id].push(r);
        });
        setResources(grouped);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModule = async () => {
    if (!editingModule) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({
          title: editingModule.title,
          description: editingModule.description,
          learning_objectives: editingModule.learning_objectives as any,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingModule.id);

      if (error) throw error;
      
      toast.success('Module updated');
      setEditDialogOpen(false);
      fetchModules();
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (moduleId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({ is_active: !currentValue, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('module_id', moduleId);

      if (error) throw error;
      toast.success(`Module ${!currentValue ? 'enabled' : 'disabled'}`);
      fetchModules();
    } catch (error) {
      toast.error('Failed to update module');
    }
  };

  const toggleLocked = async (moduleId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({ is_locked: !currentValue, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('module_id', moduleId);

      if (error) throw error;
      toast.success(`Module ${!currentValue ? 'locked' : 'unlocked'}`);
      fetchModules();
    } catch (error) {
      toast.error('Failed to update module');
    }
  };

  const handleAddResource = async () => {
    if (!activeModuleId || !newResource.title.trim()) {
      toast.error('Please enter a resource title');
      return;
    }
    
    setSaving(true);
    try {
      const currentResources = resources[activeModuleId] || [];
      const maxOrder = currentResources.length > 0 
        ? Math.max(...currentResources.map(r => r.display_order)) + 1 
        : 0;

      const { error } = await supabase
        .from('mus240_module_resources')
        .insert({
          module_id: activeModuleId,
          title: newResource.title,
          resource_type: newResource.resource_type,
          url: newResource.url || null,
          description: newResource.description || null,
          duration: newResource.duration || null,
          is_required: newResource.is_required,
          display_order: maxOrder,
          created_by: user?.id
        });

      if (error) throw error;
      
      toast.success('Resource added');
      setAddResourceDialogOpen(false);
      setNewResource({
        title: '',
        resource_type: 'video',
        url: '',
        description: '',
        duration: '',
        is_required: false
      });
      fetchModules();
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error('Failed to add resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Delete this resource?')) return;
    
    try {
      const { error } = await supabase
        .from('mus240_module_resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;
      toast.success('Resource deleted');
      fetchModules();
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  const getResourceIcon = (type: string) => {
    const resourceType = RESOURCE_TYPES.find(r => r.value === type);
    return resourceType ? resourceType.icon : FileText;
  };

  const enableAll = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({ is_active: true, is_locked: false, updated_by: user?.id })
        .neq('module_id', '');

      if (error) throw error;
      toast.success('All modules enabled');
      fetchModules();
    } catch (error) {
      toast.error('Failed to enable all modules');
    } finally {
      setSaving(false);
    }
  };

  const disableAll = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({ is_active: false, updated_by: user?.id })
        .neq('module_id', '');

      if (error) throw error;
      toast.success('All modules disabled');
      fetchModules();
    } catch (error) {
      toast.error('Failed to disable all modules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading modules...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={enableAll} disabled={saving}>
          <Eye className="h-4 w-4 mr-2" />
          Enable All
        </Button>
        <Button variant="outline" size="sm" onClick={disableAll} disabled={saving}>
          <EyeOff className="h-4 w-4 mr-2" />
          Disable All
        </Button>
      </div>

      {/* Module List */}
      <Accordion type="multiple" className="space-y-2">
        {modules.map((module) => {
          const moduleResources = resources[module.module_id] || [];
          const Icon = getResourceIcon('document');
          
          return (
            <AccordionItem key={module.id} value={module.id} className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <span className={`font-medium text-left ${!module.is_active ? 'opacity-50' : ''}`}>
                      Week {module.week_number}: {module.title || module.module_id}
                    </span>
                    <div className="flex gap-1">
                      {module.is_active ? (
                        <Badge variant="default" className="text-xs">Visible</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Hidden</Badge>
                      )}
                      {module.is_locked && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                      {moduleResources.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {moduleResources.length} resources
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Module Info */}
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {module.description || 'No description'}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={module.is_active}
                        onCheckedChange={() => toggleActive(module.module_id, module.is_active)}
                      />
                      <Label className="text-sm">Visible</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={module.is_locked}
                        onCheckedChange={() => toggleLocked(module.module_id, module.is_locked)}
                      />
                      <Label className="text-sm">Locked</Label>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingModule(module);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setActiveModuleId(module.module_id);
                        setAddResourceDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Resource
                    </Button>
                  </div>

                  {/* Resources List */}
                  {moduleResources.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-sm font-medium">Resources</h4>
                      {moduleResources.map((resource) => {
                        const ResourceIcon = getResourceIcon(resource.resource_type);
                        return (
                          <div 
                            key={resource.id}
                            className="flex items-center justify-between p-3 bg-background border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <ResourceIcon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{resource.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="capitalize">{resource.resource_type}</span>
                                  {resource.duration && <span>• {resource.duration}</span>}
                                  {resource.is_required && (
                                    <Badge variant="secondary" className="text-xs">Required</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteResource(resource.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Edit Module Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
          </DialogHeader>
          {editingModule && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editingModule.title || ''}
                  onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                  placeholder="Module title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingModule.description || ''}
                  onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                  placeholder="Module description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveModule} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Resource Dialog */}
      <Dialog open={addResourceDialogOpen} onOpenChange={setAddResourceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={newResource.title}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                placeholder="Resource title"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select 
                value={newResource.resource_type} 
                onValueChange={(v) => setNewResource({ ...newResource, resource_type: v })}
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
            <div>
              <Label>URL</Label>
              <Input
                value={newResource.url}
                onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Duration (optional)</Label>
              <Input
                value={newResource.duration}
                onChange={(e) => setNewResource({ ...newResource, duration: e.target.value })}
                placeholder="e.g., 15 min"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Brief description"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newResource.is_required}
                onCheckedChange={(v) => setNewResource({ ...newResource, is_required: v })}
              />
              <Label>Required resource</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddResourceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddResource} disabled={saving || !newResource.title.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                {saving ? 'Adding...' : 'Add Resource'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
