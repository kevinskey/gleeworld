import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Calendar,
  ChevronRight,
  Lock,
  Unlock,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import EditableModuleResources from './EditableModuleResources';

interface LH100Module {
  id: string;
  week_number: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_locked: boolean;
  learning_objectives: string[] | null;
  completion_percentage: number | null;
}

interface EditableLH100ModulesProps {
  isEnrolled?: boolean;
  isAdmin?: boolean;
}

const EditableLH100Modules: React.FC<EditableLH100ModulesProps> = ({
  isEnrolled = true,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const [modules, setModules] = useState<LH100Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newModule, setNewModule] = useState({
    week_number: 1,
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    learning_objectives: ['']
  });

  // Fetch modules from database
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const { data, error } = await supabase
          .from('lh100_modules')
          .select('*')
          .order('week_number', { ascending: true });

        if (error) throw error;
        setModules(data || []);
      } catch (error) {
        console.error('Error fetching LH100 modules:', error);
        toast.error('Failed to load modules');
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  const handleUpdateModule = async (module: LH100Module) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lh100_modules')
        .update({
          title: module.title,
          description: module.description,
          start_date: module.start_date,
          end_date: module.end_date,
          is_active: module.is_active,
          is_locked: module.is_locked,
          learning_objectives: module.learning_objectives,
          updated_at: new Date().toISOString()
        })
        .eq('id', module.id);

      if (error) throw error;
      
      setEditingId(null);
      toast.success('Module updated');
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
    } finally {
      setSaving(false);
    }
  };

  const handleAddModule = async () => {
    if (!newModule.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const newId = `lh-${modules.length + 1}`;
      const { data, error } = await supabase
        .from('lh100_modules')
        .insert({
          id: newId,
          week_number: newModule.week_number,
          title: newModule.title,
          description: newModule.description || null,
          start_date: newModule.start_date,
          end_date: newModule.end_date || newModule.start_date,
          is_active: false,
          is_locked: false,
          learning_objectives: newModule.learning_objectives.filter(o => o.trim())
        })
        .select()
        .single();

      if (error) throw error;

      setModules(prev => [...prev, data].sort((a, b) => a.week_number - b.week_number));
      setNewModule({
        week_number: modules.length + 2,
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        learning_objectives: ['']
      });
      setShowAddForm(false);
      toast.success('Module added');
    } catch (error) {
      console.error('Error adding module:', error);
      toast.error('Failed to add module');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return;

    try {
      const { error } = await supabase
        .from('lh100_modules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setModules(prev => prev.filter(m => m.id !== id));
      toast.success('Module deleted');
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module');
    }
  };

  const updateModuleField = (id: string, field: keyof LH100Module, value: any) => {
    setModules(prev => prev.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const updateLearningObjective = (moduleId: string, index: number, value: string) => {
    setModules(prev => prev.map(m => {
      if (m.id === moduleId) {
        const newObjectives = [...(m.learning_objectives || [])];
        newObjectives[index] = value;
        return { ...m, learning_objectives: newObjectives };
      }
      return m;
    }));
  };

  const addLearningObjective = (moduleId: string) => {
    setModules(prev => prev.map(m => {
      if (m.id === moduleId) {
        return { ...m, learning_objectives: [...(m.learning_objectives || []), ''] };
      }
      return m;
    }));
  };

  const removeLearningObjective = (moduleId: string, index: number) => {
    setModules(prev => prev.map(m => {
      if (m.id === moduleId) {
        const newObjectives = [...(m.learning_objectives || [])];
        newObjectives.splice(index, 1);
        return { ...m, learning_objectives: newObjectives };
      }
      return m;
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      {user && (
        <div className="flex justify-end">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </>
            )}
          </Button>
        </div>
      )}

      {/* Add Module Form */}
      {showAddForm && (
        <div className="p-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 space-y-4">
          <h3 className="font-semibold">Add New Module</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Week Number</Label>
              <Input
                type="number"
                value={newModule.week_number}
                onChange={(e) => setNewModule(prev => ({ ...prev, week_number: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <Label>Title</Label>
              <Input
                placeholder="Sunday title..."
                value={newModule.title}
                onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Module description..."
              value={newModule.description}
              onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={newModule.start_date}
                onChange={(e) => setNewModule(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={newModule.end_date}
                onChange={(e) => setNewModule(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleAddModule} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Module
          </Button>
        </div>
      )}

      {/* Modules Accordion */}
      <Accordion type="single" collapsible className="space-y-3">
        {modules.map((module) => {
          const isEditing = editingId === module.id;
          const resourceCount = 3; // From lh100_module_resources table
          
          return (
            <AccordionItem 
              key={module.id} 
              value={module.id}
              className="border rounded-lg bg-card overflow-hidden"
            >
              <AccordionTrigger className="hover:no-underline px-4 py-3">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {module.week_number}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{module.title}</h3>
                        {module.is_locked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Unlock className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(module.start_date), 'MMM d')} - {format(new Date(module.end_date), 'MMM d')}
                        </span>
                        <span className="flex items-center gap-1">
                          📚 0/{resourceCount} items
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      {module.completion_percentage || 0}%
                    </span>
                    {module.is_active && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Progress Bar */}
                  <Progress value={module.completion_percentage || 0} className="h-2" />
                  
                  {/* Description */}
                  {isEditing ? (
                    <Textarea
                      value={module.description || ''}
                      onChange={(e) => updateModuleField(module.id, 'description', e.target.value)}
                      placeholder="Module description..."
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  )}

                  {/* Learning Objectives */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Learning Objectives
                    </h4>
                    {isEditing ? (
                      <div className="space-y-2">
                        {(module.learning_objectives || []).map((objective, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              value={objective}
                              onChange={(e) => updateLearningObjective(module.id, idx, e.target.value)}
                              className="text-sm"
                              placeholder="Learning objective..."
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeLearningObjective(module.id, idx)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addLearningObjective(module.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Objective
                        </Button>
                      </div>
                    ) : (
                      <ul className="space-y-1">
                        {(module.learning_objectives || []).map((objective, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                            {objective}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Edit Mode Controls */}
                  {isEditing && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={module.title}
                          onChange={(e) => updateModuleField(module.id, 'title', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Start Date</Label>
                          <Input
                            type="date"
                            value={module.start_date}
                            onChange={(e) => updateModuleField(module.id, 'start_date', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End Date</Label>
                          <Input
                            type="date"
                            value={module.end_date}
                            onChange={(e) => updateModuleField(module.id, 'end_date', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={module.is_active}
                            onCheckedChange={(v) => updateModuleField(module.id, 'is_active', v)}
                          />
                          <Label className="text-xs">Active</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={module.is_locked}
                            onCheckedChange={(v) => updateModuleField(module.id, 'is_locked', v)}
                          />
                          <Label className="text-xs">Locked</Label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Module Resources */}
                  <EditableModuleResources 
                    moduleId={module.id}
                    isLocked={module.is_locked}
                  />

                  {/* Action Buttons */}
                  {user && (
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateModule(module)}
                            disabled={saving}
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(module.id)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDeleteModule(module.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default EditableLH100Modules;
