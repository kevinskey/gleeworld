import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Lock, Eye, EyeOff, Plus, Trash2, Edit, Save, 
  Video, FileText, Music, BookOpen, Link, Calendar,
  X, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface ModuleSetting {
  id: string;
  module_id: string;
  title: string | null;
  description: string | null;
  is_active: boolean;
  is_locked: boolean;
  week_number: number | null;
  learning_objectives: string[];
  semester: string;
  start_date: string | null;
  end_date: string | null;
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
  const [editResourceDialogOpen, setEditResourceDialogOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<ModuleResource | null>(null);
  const [newObjective, setNewObjective] = useState('');
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
      }).map(m => ({
        ...m,
        learning_objectives: Array.isArray(m.learning_objectives) 
          ? (m.learning_objectives as unknown as string[]) 
          : []
      })) as ModuleSetting[];
      
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
          week_number: editingModule.week_number,
          start_date: editingModule.start_date,
          end_date: editingModule.end_date,
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

  const addObjective = () => {
    if (!editingModule || !newObjective.trim()) return;
    setEditingModule({
      ...editingModule,
      learning_objectives: [...editingModule.learning_objectives, newObjective.trim()]
    });
    setNewObjective('');
  };

  const removeObjective = (index: number) => {
    if (!editingModule) return;
    setEditingModule({
      ...editingModule,
      learning_objectives: editingModule.learning_objectives.filter((_, i) => i !== index)
    });
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

  const handleUpdateResource = async () => {
    if (!editingResource) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('mus240_module_resources')
        .update({
          title: editingResource.title,
          resource_type: editingResource.resource_type,
          url: editingResource.url,
          description: editingResource.description,
          duration: editingResource.duration,
          is_required: editingResource.is_required
        })
        .eq('id', editingResource.id);

      if (error) throw error;
      
      toast.success('Resource updated');
      setEditResourceDialogOpen(false);
      setEditingResource(null);
      fetchModules();
    } catch (error) {
      toast.error('Failed to update resource');
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
          
          return (
            <AccordionItem key={module.id} value={module.id} className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                      !module.is_active ? 'bg-muted text-muted-foreground opacity-50' : 'bg-primary/10 text-primary'
                    }`}>
                      {module.week_number || '?'}
                    </div>
                    <div className="text-left">
                      <span className={`font-medium ${!module.is_active ? 'opacity-50' : ''}`}>
                        {module.title || `Week ${module.week_number}`}
                      </span>
                      {module.start_date && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(module.start_date), 'MMM d')} 
                          {module.end_date && ` - ${format(new Date(module.end_date), 'MMM d')}`}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
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
                  {/* Module Preview (Student View) */}
                  <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Student View Preview
                    </h4>
                    
                    <div>
                      <p className="text-sm font-medium">Description:</p>
                      {module.description ? (
                        <div 
                          className="text-sm text-muted-foreground prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: module.description }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic opacity-50">No description set</p>
                      )}
                    </div>

                    {module.learning_objectives && module.learning_objectives.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Learning Objectives:</p>
                        <ul className="space-y-1">
                          {module.learning_objectives.map((obj, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!module.learning_objectives?.length && (
                      <p className="text-sm text-muted-foreground italic">No learning objectives set</p>
                    )}
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
                      Edit Module
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
                      <h4 className="text-sm font-medium">Resources ({moduleResources.length})</h4>
                      {moduleResources.map((resource) => {
                        const ResourceIcon = getResourceIcon(resource.resource_type);
                        return (
                          <div 
                            key={resource.id}
                            className="flex items-center justify-between p-3 bg-background border rounded-lg"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <ResourceIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{resource.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="capitalize">{resource.resource_type}</span>
                                  {resource.duration && <span>• {resource.duration}</span>}
                                  {resource.is_required && (
                                    <Badge variant="secondary" className="text-xs">Required</Badge>
                                  )}
                                </div>
                                {resource.description && (
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">{resource.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setEditingResource(resource);
                                  setEditResourceDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteResource(resource.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {moduleResources.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">
                      No resources added yet. Click "Add Resource" to add content.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Edit Module Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Module - Week {editingModule?.week_number}</DialogTitle>
          </DialogHeader>
          {editingModule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Week Number</Label>
                  <Input
                    type="number"
                    value={editingModule.week_number || ''}
                    onChange={(e) => setEditingModule({ 
                      ...editingModule, 
                      week_number: parseInt(e.target.value) || null 
                    })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={editingModule.title || ''}
                    onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                    placeholder="Module title"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={editingModule.start_date || ''}
                    onChange={(e) => setEditingModule({ ...editingModule, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={editingModule.end_date || ''}
                    onChange={(e) => setEditingModule({ ...editingModule, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <RichTextEditor
                  value={editingModule.description || ''}
                  onChange={(val) => setEditingModule({ ...editingModule, description: val })}
                  placeholder="Module description (shown to students)"
                  minHeight="150px"
                />
              </div>

              <div>
                <Label>Learning Objectives</Label>
                <div className="space-y-2 mt-2">
                  {editingModule.learning_objectives.map((obj, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input value={obj} readOnly className="flex-1" />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeObjective(idx)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newObjective}
                      onChange={(e) => setNewObjective(e.target.value)}
                      placeholder="Add a learning objective..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addObjective();
                        }
                      }}
                    />
                    <Button variant="outline" size="icon" onClick={addObjective}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
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
                  {RESOURCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
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
              <Label>Description</Label>
              <Textarea
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Brief description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration</Label>
                <Input
                  value={newResource.duration}
                  onChange={(e) => setNewResource({ ...newResource, duration: e.target.value })}
                  placeholder="e.g., 15 min"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={newResource.is_required}
                  onCheckedChange={(checked) => setNewResource({ ...newResource, is_required: checked })}
                />
                <Label>Required</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddResourceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddResource} disabled={saving}>
                <Plus className="h-4 w-4 mr-2" />
                {saving ? 'Adding...' : 'Add Resource'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={editResourceDialogOpen} onOpenChange={setEditResourceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
          </DialogHeader>
          {editingResource && (
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  placeholder="Resource title"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select 
                  value={editingResource.resource_type} 
                  onValueChange={(v) => setEditingResource({ ...editingResource, resource_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={editingResource.url || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingResource.description || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  placeholder="Brief description"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={editingResource.duration || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, duration: e.target.value })}
                    placeholder="e.g., 15 min"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={editingResource.is_required}
                    onCheckedChange={(checked) => setEditingResource({ ...editingResource, is_required: checked })}
                  />
                  <Label>Required</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditResourceDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateResource} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
