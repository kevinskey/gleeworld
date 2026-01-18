import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  BookOpen,
  Save,
  Edit2,
  X,
  Plus,
  Trash2,
  Loader2,
  Lock,
  Unlock,
  ChevronRight,
  Target,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export interface LH100Module {
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

interface WeeklyModuleEditorProps {
  module: LH100Module;
  onUpdate: (module: LH100Module) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isAdmin?: boolean;
}

export const WeeklyModuleEditor: React.FC<WeeklyModuleEditorProps> = ({
  module,
  onUpdate,
  onDelete,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedModule, setEditedModule] = useState<LH100Module>(module);

  useEffect(() => {
    setEditedModule(module);
    setIsEditing(false);
  }, [module.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(editedModule);
      setIsEditing(false);
      toast.success('Module saved');
    } catch (error) {
      console.error('Error saving module:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedModule(module);
    setIsEditing(false);
  };

  const updateField = (field: keyof LH100Module, value: any) => {
    setEditedModule(prev => ({ ...prev, [field]: value }));
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...(editedModule.learning_objectives || [])];
    newObjectives[index] = value;
    updateField('learning_objectives', newObjectives);
  };

  const addObjective = () => {
    updateField('learning_objectives', [...(editedModule.learning_objectives || []), '']);
  };

  const removeObjective = (index: number) => {
    const newObjectives = [...(editedModule.learning_objectives || [])];
    newObjectives.splice(index, 1);
    updateField('learning_objectives', newObjectives);
  };

  const startDate = editedModule.start_date ? parseISO(editedModule.start_date) : null;
  const endDate = editedModule.end_date ? parseISO(editedModule.end_date) : null;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
              {editedModule.week_number}
            </div>
            <div>
              {isEditing ? (
                <Input
                  value={editedModule.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="text-lg font-semibold h-9"
                  placeholder="Sunday title..."
                />
              ) : (
                <h2 className="text-xl font-bold">{editedModule.title}</h2>
              )}
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {startDate && endDate ? (
                  <span>
                    {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                  </span>
                ) : (
                  <span>No dates set</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editedModule.is_active && (
            <Badge className="bg-green-600">Active</Badge>
          )}
          {editedModule.is_locked ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> Locked
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Unlock className="h-3 w-3" /> Open
            </Badge>
          )}
          
          {user && (
            isEditing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )
          )}
        </div>
      </div>

      <Separator />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Details */}
        <div className="space-y-6">
          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editedModule.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Enter module description..."
                  rows={4}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {editedModule.description || 'No description provided.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Dates & Status (Edit Mode Only) */}
          {isEditing && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Schedule & Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Start Date</Label>
                    <Input
                      type="date"
                      value={editedModule.start_date}
                      onChange={(e) => updateField('start_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Date</Label>
                    <Input
                      type="date"
                      value={editedModule.end_date}
                      onChange={(e) => updateField('end_date', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editedModule.is_active}
                      onCheckedChange={(v) => updateField('is_active', v)}
                      id="is-active"
                    />
                    <Label htmlFor="is-active" className="text-sm">Active Week</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editedModule.is_locked}
                      onCheckedChange={(v) => updateField('is_locked', v)}
                      id="is-locked"
                    />
                    <Label htmlFor="is-locked" className="text-sm">Locked</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Learning Objectives */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Learning Objectives
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  {(editedModule.learning_objectives || []).map((objective, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={objective}
                        onChange={(e) => updateObjective(idx, e.target.value)}
                        placeholder="Learning objective..."
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeObjective(idx)}
                        className="text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addObjective}
                    className="w-full mt-2"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Objective
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(editedModule.learning_objectives || []).length > 0 ? (
                    (editedModule.learning_objectives || []).map((objective, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No learning objectives set.</p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Progress Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-primary" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Completion</span>
                <span className="text-lg font-bold">{editedModule.completion_percentage || 0}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all"
                  style={{ width: `${editedModule.completion_percentage || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Option (Admin Only) */}
      {isEditing && isAdmin && onDelete && (
        <div className="pt-4 border-t">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to delete this module?')) {
                onDelete(module.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Module
          </Button>
        </div>
      )}
    </div>
  );
};
