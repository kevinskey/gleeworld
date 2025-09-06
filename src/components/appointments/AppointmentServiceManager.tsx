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

interface AppointmentService {
  id: string;
  name: string;
  description: string;
  default_duration_minutes: number;
  color: string;
  is_active: boolean;
  location?: string;
  instructor?: string;
  price_amount?: number;
  price_display?: string;
  capacity_min?: number;
  capacity_max?: number;
  badge_text?: string;
  badge_color?: string;
  category?: string;
  requires_approval?: boolean;
  booking_buffer_minutes?: number;
  advance_booking_days?: number;
  image_url?: string;
}

export const AppointmentServiceManager = () => {
  const [appointmentServices, setAppointmentServices] = useState<AppointmentService[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<AppointmentService | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_duration_minutes: 30,
    color: '#6366F1',
    location: '',
    instructor: '',
    price_amount: 0,
    price_display: 'Free',
    capacity_min: 1,
    capacity_max: 1,
    badge_text: '',
    badge_color: '#6366F1',
    category: 'general',
    requires_approval: false,
    booking_buffer_minutes: 15,
    advance_booking_days: 30,
    image_url: ''
  });

  useEffect(() => {
    fetchAppointmentServices();
  }, []);

  const fetchAppointmentServices = async () => {
    const { data, error } = await supabase
      .from('gw_appointment_services')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Failed to fetch appointment services');
      return;
    }

    setAppointmentServices(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingService) {
        const { error } = await supabase
          .from('gw_appointment_services')
          .update(formData)
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Appointment service updated successfully');
      } else {
        const { error } = await supabase
          .from('gw_appointment_services')
          .insert([formData]);

        if (error) throw error;
        toast.success('Appointment service created successfully');
      }

      setIsDialogOpen(false);
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        default_duration_minutes: 30,
        color: '#6366F1',
        location: '',
        instructor: '',
        price_amount: 0,
        price_display: 'Free',
        capacity_min: 1,
        capacity_max: 1,
        badge_text: '',
        badge_color: '#6366F1',
        category: 'general',
        requires_approval: false,
        booking_buffer_minutes: 15,
        advance_booking_days: 30,
        image_url: ''
      });
      fetchAppointmentServices();
    } catch (error) {
      toast.error('Failed to save appointment service');
    }
  };

  const handleEdit = (service: AppointmentService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      default_duration_minutes: service.default_duration_minutes,
      color: service.color,
      location: service.location || '',
      instructor: service.instructor || '',
      price_amount: service.price_amount || 0,
      price_display: service.price_display || 'Free',
      capacity_min: service.capacity_min || 1,
      capacity_max: service.capacity_max || 1,
      badge_text: service.badge_text || '',
      badge_color: service.badge_color || '#6366F1',
      category: service.category || 'general',
      requires_approval: service.requires_approval || false,
      booking_buffer_minutes: service.booking_buffer_minutes || 15,
      advance_booking_days: service.advance_booking_days || 30,
      image_url: service.image_url || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this appointment service?')) return;

    try {
      const { error } = await supabase
        .from('gw_appointment_services')
        .update({ is_active: false })
        .eq('id', serviceId);

      if (error) throw error;
      toast.success('Appointment service deleted');
      fetchAppointmentServices();
    } catch (error) {
      toast.error('Failed to delete appointment service');
    }
  };

  // Professional color palette for appointment services
  const colors = [
    '#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#3B82F6'
  ];

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'coaching', label: 'Coaching' },
    { value: 'rehearsal', label: 'Rehearsal' },
    { value: 'accompaniment', label: 'Accompaniment' },
    { value: 'education', label: 'Education' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Appointment Services</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingService ? 'Edit Appointment Service' : 'Create Appointment Service'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
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
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="instructor">Instructor</Label>
                  <Input
                    id="instructor"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="price_amount">Price Amount</Label>
                  <Input
                    id="price_amount"
                    type="number"
                    step="0.01"
                    value={formData.price_amount}
                    onChange={(e) => setFormData({ ...formData, price_amount: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="price_display">Price Display</Label>
                  <Input
                    id="price_display"
                    value={formData.price_display}
                    onChange={(e) => setFormData({ ...formData, price_display: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="capacity_min">Min Capacity</Label>
                  <Input
                    id="capacity_min"
                    type="number"
                    min="1"
                    value={formData.capacity_min}
                    onChange={(e) => setFormData({ ...formData, capacity_min: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="capacity_max">Max Capacity</Label>
                  <Input
                    id="capacity_max"
                    type="number"
                    min="1"
                    value={formData.capacity_max}
                    onChange={(e) => setFormData({ ...formData, capacity_max: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="badge_text">Badge Text</Label>
                  <Input
                    id="badge_text"
                    value={formData.badge_text}
                    onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
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
                <div className="md:col-span-2">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingService ? 'Update' : 'Create'}
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
        {appointmentServices.filter(service => service.is_active).map((service) => (
          <Card key={service.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: service.color }}
                  />
                  <CardTitle className="text-sm">{service.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(service)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {service.description || 'No description'}
              </p>
              <div className="space-y-2">
                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                  <Clock className="h-3 w-3" />
                  {service.default_duration_minutes} min
                </Badge>
                {service.price_display && (
                  <Badge variant="outline" className="w-fit">
                    {service.price_display}
                  </Badge>
                )}
                {service.location && (
                  <p className="text-xs text-muted-foreground">📍 {service.location}</p>
                )}
                {service.instructor && (
                  <p className="text-xs text-muted-foreground">👨‍🏫 {service.instructor}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};