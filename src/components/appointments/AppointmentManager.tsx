import React, { useState } from 'react';
import { Calendar, Clock, User, Mail, Phone, Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { useCalendars } from '@/hooks/useCalendars';

interface Appointment {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  service: string;
  date: Date;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  calendarId?: string;
}

interface AppointmentManagerProps {
  appointments?: Appointment[];
  onAppointmentCreate?: (appointment: Omit<Appointment, 'id'>) => void;
  onAppointmentUpdate?: (id: string, appointment: Partial<Appointment>) => void;
  onAppointmentDelete?: (id: string) => void;
  editingAppointmentId?: string | null;
  onEditingAppointmentIdChange?: (id: string | null) => void;
}

import { useServices } from '@/hooks/useServices';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

export const AppointmentManager: React.FC<AppointmentManagerProps> = ({
  appointments = [],
  editingAppointmentId,
  onEditingAppointmentIdChange,
  onAppointmentCreate,
  onAppointmentUpdate,
  onAppointmentDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const { data: calendars = [] } = useCalendars();
  const { data: services = [] } = useServices();

  // Handle external editing request from calendar
  React.useEffect(() => {
    if (editingAppointmentId) {
      const appointmentToEdit = appointments.find(apt => apt.id === editingAppointmentId);
      if (appointmentToEdit) {
        handleEdit(appointmentToEdit); // This sets both editingAppointment and populates form
        onEditingAppointmentIdChange?.(null); // Clear the external ID
      }
    }
  }, [editingAppointmentId, appointments, onEditingAppointmentIdChange]);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    service: '',
    date: '',
    time: '',
    duration: 60,
    status: 'pending' as 'pending' | 'confirmed' | 'completed' | 'cancelled',
    notes: '',
    calendarId: 'none'
  });

  // Generate next 30 days for date picker
  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE, MMMM do')
    };
  });

  const resetForm = () => {
    setFormData({
      title: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      service: '',
      date: '',
      time: '',
      duration: 60,
      status: 'pending' as 'pending' | 'confirmed' | 'completed' | 'cancelled',
      notes: '',
      calendarId: 'none'
    });
  };

  const handleCreate = () => {
    if (!formData.clientName || !formData.clientEmail || !formData.service || !formData.date || !formData.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    const selectedService = services.find(s => s.id === formData.service);
    const serviceName = selectedService?.name || formData.service;
    
    const newAppointment: Omit<Appointment, 'id'> = {
      title: formData.title || `${serviceName} with ${formData.clientName}`,
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      clientPhone: formData.clientPhone,
      service: formData.service, // Pass the service ID instead of name
      date: new Date(formData.date),
      time: formData.time,
      duration: formData.duration,
      status: formData.status,
      notes: formData.notes,
      calendarId: formData.calendarId === 'none' ? '' : formData.calendarId
    };

    onAppointmentCreate?.(newAppointment);
    toast.success('Appointment created successfully!');
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingAppointment) return;

    const selectedService = services.find(s => s.id === formData.service);
    const serviceName = selectedService?.name || formData.service;
    
    const updates: Partial<Appointment> = {
      title: formData.title || `${serviceName} with ${formData.clientName}`,
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      clientPhone: formData.clientPhone,
      service: formData.service, // Pass the service ID instead of name
      date: new Date(formData.date),
      time: formData.time,
      duration: formData.duration,
      status: formData.status,
      notes: formData.notes,
      calendarId: formData.calendarId === 'none' ? '' : formData.calendarId
    };

    onAppointmentUpdate?.(editingAppointment.id, updates);
    toast.success('Appointment updated successfully!');
    setEditingAppointment(null);
    resetForm();
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    
    // Find the service ID by matching category with appointment.service (which is actually the appointment_type/category)
    const matchingService = services.find(s => s.category === appointment.service);
    
    setFormData({
      title: appointment.title,
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      clientPhone: appointment.clientPhone || '',
      service: matchingService?.id || '', // Use service ID if found, otherwise empty
      date: format(appointment.date, 'yyyy-MM-dd'),
      time: appointment.time,
      duration: appointment.duration,
      status: appointment.status,
      notes: appointment.notes || '',
      calendarId: appointment.calendarId || 'none'
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this appointment?')) {
      onAppointmentDelete?.(id);
      toast.success('Appointment deleted successfully!');
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const AppointmentForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <Label>Service *</Label>
          <Select value={formData.service} onValueChange={(value) => setFormData(prev => ({ ...prev, service: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              {services.map(service => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} - {service.duration_minutes}min - {service.price_display}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Date *</Label>
          <Select value={formData.date} onValueChange={(value) => setFormData(prev => ({ ...prev, date: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              {availableDates.map(date => (
                <SelectItem key={date.value} value={date.value}>
                  {date.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Time *</Label>
          <Select value={formData.time} onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map(time => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Calendar</Label>
          <Select value={formData.calendarId} onValueChange={(value) => setFormData(prev => ({ ...prev, calendarId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select calendar (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific calendar</SelectItem>
              {calendars.map(calendar => (
                <SelectItem key={calendar.id} value={calendar.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: calendar.color }}
                    />
                    {calendar.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isEdit && (
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label>Client Name *</Label>
          <Input
            value={formData.clientName}
            onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
            placeholder="Full name"
          />
        </div>

        <div>
          <Label>Email *</Label>
          <Input
            type="email"
            value={formData.clientEmail}
            onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
            placeholder="email@example.com"
          />
        </div>

        <div>
          <Label>Phone</Label>
          <Input
            value={formData.clientPhone}
            onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Appointment Management</h2>
          <p className="text-muted-foreground">Manage and track all appointments</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Appointment</DialogTitle>
              <DialogDescription>Fill in the details to schedule a new appointment</DialogDescription>
            </DialogHeader>
            <AppointmentForm />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Appointment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search appointments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle>Appointments ({filteredAppointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No appointments found</p>
              <p className="text-muted-foreground">Create your first appointment to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{appointment.title}</h3>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{appointment.clientName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(appointment.date, 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{appointment.clientEmail}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{appointment.time} ({appointment.duration} min)</span>
                        </div>
                        {appointment.clientPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{appointment.clientPhone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{appointment.service}</span>
                        </div>
                      </div>
                      
                      {appointment.notes && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Notes:</span> {appointment.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(appointment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(appointment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingAppointment} onOpenChange={(open) => !open && setEditingAppointment(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>Update appointment details</DialogDescription>
          </DialogHeader>
          <AppointmentForm isEdit />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditingAppointment(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update Appointment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};