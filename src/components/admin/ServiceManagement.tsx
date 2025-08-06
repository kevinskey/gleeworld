import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useServices, useCreateService, useUpdateService, useDeleteService, Service } from '@/hooks/useServices';
import { toast } from 'sonner';

interface ServiceFormData {
  name: string;
  description: string;
  image_url: string;
  duration_minutes: number;
  capacity_min: number;
  capacity_max: number;
  price_amount: number;
  price_display: string;
  location: string;
  instructor: string;
  badge_text: string;
  badge_color: string;
  category: string;
  requires_approval: boolean;
  booking_buffer_minutes: number;
  advance_booking_days: number;
}

const initialFormData: ServiceFormData = {
  name: '',
  description: '',
  image_url: '',
  duration_minutes: 45,
  capacity_min: 1,
  capacity_max: 1,
  price_amount: 0,
  price_display: 'Free',
  location: '',
  instructor: '',
  badge_text: '',
  badge_color: 'bg-blue-500',
  category: 'general',
  requires_approval: false,
  booking_buffer_minutes: 15,
  advance_booking_days: 30,
};

const badgeColors = [
  { value: 'bg-blue-500', label: 'Blue' },
  { value: 'bg-green-500', label: 'Green' },
  { value: 'bg-yellow-500', label: 'Yellow' },
  { value: 'bg-red-500', label: 'Red' },
  { value: 'bg-purple-500', label: 'Purple' },
  { value: 'bg-orange-500', label: 'Orange' },
];

const categories = [
  { value: 'general', label: 'General' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'accompaniment', label: 'Accompaniment' },
  { value: 'education', label: 'Education' },
];

export default function ServiceManagement() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(initialFormData);

  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      description: service.description || '',
      image_url: service.image_url || '',
      duration_minutes: service.duration_minutes,
      capacity_min: service.capacity_min,
      capacity_max: service.capacity_max,
      price_amount: service.price_amount,
      price_display: service.price_display,
      location: service.location || '',
      instructor: service.instructor || '',
      badge_text: service.badge_text || '',
      badge_color: service.badge_color || 'bg-blue-500',
      category: service.category,
      requires_approval: service.requires_approval,
      booking_buffer_minutes: service.booking_buffer_minutes,
      advance_booking_days: service.advance_booking_days,
    });
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateService.mutateAsync({ id: editingId, ...formData, is_active: true });
        setEditingId(null);
      } else {
        await createService.mutateAsync({ ...formData, is_active: true });
        setIsCreating(false);
      }
      setFormData(initialFormData);
    } catch (error) {
      toast.error('Failed to save service');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this service?')) {
      await deleteService.mutateAsync(id);
    }
  };

  const handleInputChange = (field: keyof ServiceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <div>Loading services...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Service Management</h2>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating || editingId !== null}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Service' : 'Create New Service'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Voice Coaching"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Service description..."
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Music Room A"
                />
              </div>

              <div>
                <Label htmlFor="instructor">Instructor</Label>
                <Input
                  id="instructor"
                  value={formData.instructor}
                  onChange={(e) => handleInputChange('instructor', e.target.value)}
                  placeholder="e.g., Dr. Johnson"
                />
              </div>

              <div>
                <Label htmlFor="price">Price Amount</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price_amount}
                  onChange={(e) => handleInputChange('price_amount', parseFloat(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="price_display">Price Display</Label>
                <Input
                  id="price_display"
                  value={formData.price_display}
                  onChange={(e) => handleInputChange('price_display', e.target.value)}
                  placeholder="e.g., $75 or Free"
                />
              </div>

              <div>
                <Label htmlFor="capacity_min">Min Capacity</Label>
                <Input
                  id="capacity_min"
                  type="number"
                  value={formData.capacity_min}
                  onChange={(e) => handleInputChange('capacity_min', parseInt(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="capacity_max">Max Capacity</Label>
                <Input
                  id="capacity_max"
                  type="number"
                  value={formData.capacity_max}
                  onChange={(e) => handleInputChange('capacity_max', parseInt(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="badge_text">Badge Text</Label>
                <Input
                  id="badge_text"
                  value={formData.badge_text}
                  onChange={(e) => handleInputChange('badge_text', e.target.value)}
                  placeholder="e.g., Popular, New"
                />
              </div>

              <div>
                <Label htmlFor="badge_color">Badge Color</Label>
                <Select value={formData.badge_color} onValueChange={(value) => handleInputChange('badge_color', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {badgeColors.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.value}`}></div>
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => handleInputChange('image_url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_approval"
                  checked={formData.requires_approval}
                  onCheckedChange={(checked) => handleInputChange('requires_approval', checked)}
                />
                <Label htmlFor="requires_approval">Requires Approval</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createService.isPending || updateService.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services?.map((service) => (
          <Card key={service.id} className="relative">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{service.name}</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(service)}
                    disabled={editingId !== null || isCreating}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(service.id)}
                    disabled={deleteService.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{service.description}</p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{service.duration_minutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span>Capacity:</span>
                  <span>{service.capacity_min}-{service.capacity_max}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span>{service.price_display}</span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span>{service.location || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Instructor:</span>
                  <span>{service.instructor || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="capitalize">{service.category}</span>
                </div>
              </div>

              {service.badge_text && (
                <div className="mt-3">
                  <Badge className={`${service.badge_color} text-white`}>
                    {service.badge_text}
                  </Badge>
                </div>
              )}

              {service.requires_approval && (
                <div className="mt-2">
                  <Badge variant="secondary">Requires Approval</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}