import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Trash2 } from 'lucide-react';

interface AddModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (module: NewModuleData) => Promise<void>;
  nextWeekNumber: number;
}

export interface NewModuleData {
  week_number: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  learning_objectives: string[];
}

export const AddModuleDialog: React.FC<AddModuleDialogProps> = ({
  open,
  onOpenChange,
  onAdd,
  nextWeekNumber
}) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewModuleData>({
    week_number: nextWeekNumber,
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    learning_objectives: ['']
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    try {
      await onAdd({
        ...form,
        learning_objectives: form.learning_objectives.filter(o => o.trim())
      });
      setForm({
        week_number: nextWeekNumber + 1,
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        learning_objectives: ['']
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...form.learning_objectives];
    newObjectives[index] = value;
    setForm(prev => ({ ...prev, learning_objectives: newObjectives }));
  };

  const addObjective = () => {
    setForm(prev => ({ ...prev, learning_objectives: [...prev.learning_objectives, ''] }));
  };

  const removeObjective = (index: number) => {
    const newObjectives = [...form.learning_objectives];
    newObjectives.splice(index, 1);
    setForm(prev => ({ ...prev, learning_objectives: newObjectives }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Week</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Week Number</Label>
              <Input
                type="number"
                value={form.week_number}
                onChange={(e) => setForm(prev => ({ ...prev, week_number: parseInt(e.target.value) || 1 }))}
                min={1}
              />
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Second Sunday of Lent"
                required
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Module description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Learning Objectives</Label>
            <div className="space-y-2 mt-2">
              {form.learning_objectives.map((objective, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={objective}
                    onChange={(e) => updateObjective(idx, e.target.value)}
                    placeholder="Learning objective..."
                    className="flex-1"
                  />
                  {form.learning_objectives.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeObjective(idx)}
                      className="text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addObjective}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Objective
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add Week
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
