import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppointmentType {
  id: string;
  name: string;
  description: string;
  default_duration_minutes: number;
  color: string;
  is_active: boolean;
}

export const AppointmentTypeManager = () => {
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AppointmentType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_duration_minutes: 30,
    color: '#3B82F6'
  });

  useEffect(() => {
    fetchAppointmentTypes();
  }, []);

  const fetchAppointmentTypes = async () => {
    const { data, error } = await supabase
      .from('gw_appointment_types')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Failed to fetch appointment types');
      return;
    }

    setAppointmentTypes(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingType) {
        const { error } = await supabase
          .from('gw_appointment_types')
          .update(formData)
          .eq('id', editingType.id);

        if (error) throw error;
        toast.success('Appointment type updated successfully');
      } else {
        const { error } = await supabase
          .from('gw_appointment_types')
          .insert([formData]);

        if (error) throw error;
        toast.success('Appointment type created successfully');
      }

      setIsDialogOpen(false);
      setEditingType(null);
      setFormData({
        name: '',
        description: '',
        default_duration_minutes: 30,
        color: '#3B82F6'
      });
      fetchAppointmentTypes();
    } catch (error) {
      toast.error('Failed to save appointment type');
    }
  };

  const handleEdit = (type: AppointmentType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || '',
      default_duration_minutes: type.default_duration_minutes,
      color: type.color
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this appointment type?')) return;

    try {
      const { error } = await supabase
        .from('gw_appointment_types')
        .update({ is_active: false })
        .eq('id', typeId);

      if (error) throw error;
      toast.success('Appointment type deleted');
      fetchAppointmentTypes();
    } catch (error) {
      toast.error('Failed to delete appointment type');
    }
  };

  const colors = [
    '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Appointment Types</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Type
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                />
              </div>
              <div>
                <Label htmlFor="duration">Default Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="480"
                  value={formData.default_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, default_duration_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-foreground' : 'border-muted'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingType ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {appointmentTypes.filter(type => type.is_active).map((type) => (
          <Card key={type.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <CardTitle className="text-sm">{type.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(type)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(type.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {type.description || 'No description'}
              </p>
              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                <Clock className="h-3 w-3" />
                {type.default_duration_minutes} min
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};