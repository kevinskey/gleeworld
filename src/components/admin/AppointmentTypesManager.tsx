import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppointmentType {
  id: string;
  name: string;
  description: string;
  default_duration_minutes: number;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AppointmentTypeForm {
  name: string;
  description: string;
  default_duration_minutes: number;
  color: string;
  is_active: boolean;
}

export const AppointmentTypesManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AppointmentType | null>(null);
  const [formData, setFormData] = useState<AppointmentTypeForm>({
    name: '',
    description: '',
    default_duration_minutes: 30,
    color: '#3B82F6',
    is_active: true
  });

  const queryClient = useQueryClient();

  // Fetch appointment types
  const { data: appointmentTypes = [], isLoading } = useQuery({
    queryKey: ['appointment-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_appointment_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as AppointmentType[];
    }
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AppointmentTypeForm) => {
      if (editingType) {
        const { error } = await supabase
          .from('gw_appointment_types')
          .update(data)
          .eq('id', editingType.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gw_appointment_types')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-types'] });
      toast.success(editingType ? 'Appointment type updated!' : 'Appointment type created!');
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to save appointment type: ${error.message}`);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_appointment_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-types'] });
      toast.success('Appointment type deleted!');
    },
    onError: (error) => {
      toast.error(`Failed to delete appointment type: ${error.message}`);
    }
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('gw_appointment_types')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-types'] });
      toast.success('Appointment type status updated!');
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      default_duration_minutes: 30,
      color: '#3B82F6',
      is_active: true
    });
    setEditingType(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (type: AppointmentType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description,
      default_duration_minutes: type.default_duration_minutes,
      color: type.color,
      is_active: type.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Appointment Types</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingType ? 'Edit Appointment Type' : 'Create Appointment Type'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    max="240"
                    step="5"
                    value={formData.default_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, default_duration_minutes: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : (editingType ? 'Update' : 'Create')}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading appointment types...</p>
        ) : (
          <div className="space-y-3">
            {appointmentTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <div>
                    <div className="font-medium">{type.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {type.default_duration_minutes} minutes
                      {type.description && ` • ${type.description}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActiveMutation.mutate({ id: type.id, is_active: !type.is_active })}
                  >
                    {type.is_active ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(type)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this appointment type?')) {
                        deleteMutation.mutate(type.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {appointmentTypes.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No appointment types found. Create your first one!
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};