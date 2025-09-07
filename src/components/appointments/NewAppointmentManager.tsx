import React, { useState } from 'react';
import { Calendar, Clock, Users, Settings, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  useAllAppointments, 
  useAppointmentServices, 
  useUpdateAppointmentStatus, 
  useManageServices,
  AppointmentService,
  SimpleAppointment
} from '@/hooks/useNewAppointments';
import { format, parseISO } from 'date-fns';

export const NewAppointmentManager = () => {
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<AppointmentService | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<SimpleAppointment | null>(null);

  const { data: appointments = [], isLoading: appointmentsLoading } = useAllAppointments();
  const { data: services = [], isLoading: servicesLoading } = useAppointmentServices();
  const updateStatus = useUpdateAppointmentStatus();
  const { createService, updateService, deleteService } = useManageServices();

  // Service form state
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceDuration, setServiceDuration] = useState(60);
  const [servicePrice, setServicePrice] = useState('');
  const [serviceLocation, setServiceLocation] = useState('');
  const [serviceColor, setServiceColor] = useState('#3B82F6');

  const handleServiceSubmit = async () => {
    const serviceData = {
      name: serviceName,
      description: serviceDescription,
      duration_minutes: serviceDuration,
      price: servicePrice ? parseFloat(servicePrice) : undefined,
      location: serviceLocation,
      color: serviceColor,
      is_active: true,
      max_attendees: 1
    };

    if (editingService) {
      await updateService.mutateAsync({ id: editingService.id, ...serviceData });
    } else {
      await createService.mutateAsync(serviceData);
    }

    // Reset form
    setServiceName('');
    setServiceDescription('');
    setServiceDuration(60);
    setServicePrice('');
    setServiceLocation('');
    setServiceColor('#3B82F6');
    setEditingService(null);
    setServiceDialogOpen(false);
  };

  const handleEditService = (service: AppointmentService) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceDescription(service.description || '');
    setServiceDuration(service.duration_minutes);
    setServicePrice(service.price?.toString() || '');
    setServiceLocation(service.location || '');
    setServiceColor(service.color);
    setServiceDialogOpen(true);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      await deleteService.mutateAsync(serviceId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const upcomingAppointments = appointments.filter(apt => 
    new Date(apt.appointment_date) >= new Date() && apt.status !== 'cancelled'
  );

  const todaysAppointments = appointments.filter(apt => {
    const today = new Date();
    const aptDate = new Date(apt.appointment_date);
    return aptDate.toDateString() === today.toDateString() && apt.status !== 'cancelled';
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Appointment Management</h1>
          <p className="text-muted-foreground">
            Manage appointment services and bookings
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{todaysAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Today's Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{appointments.length}</p>
                <p className="text-sm text-muted-foreground">Total Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{services.length}</p>
                <p className="text-sm text-muted-foreground">Active Services</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Appointments</CardTitle>
              <CardDescription>Manage and view all scheduled appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{appointment.client_name}</div>
                          <div className="text-sm text-muted-foreground">{appointment.client_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{appointment.service?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.service?.duration_minutes} min
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {format(parseISO(appointment.appointment_date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {appointment.start_time} - {appointment.end_time}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Select
                            value={appointment.status}
                            onValueChange={(newStatus: any) =>
                              updateStatus.mutate({
                                appointmentId: appointment.id,
                                status: newStatus
                              })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAppointment(appointment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Appointment Services</CardTitle>
                <CardDescription>Manage available appointment types</CardDescription>
              </div>
              <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingService ? 'Edit Service' : 'Create New Service'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure the details for this appointment service
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="service-name">Service Name</Label>
                      <Input
                        id="service-name"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        placeholder="e.g., General Consultation"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service-description">Description</Label>
                      <Textarea
                        id="service-description"
                        value={serviceDescription}
                        onChange={(e) => setServiceDescription(e.target.value)}
                        placeholder="Brief description of the service"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="service-duration">Duration (minutes)</Label>
                        <Input
                          id="service-duration"
                          type="number"
                          value={serviceDuration}
                          onChange={(e) => setServiceDuration(parseInt(e.target.value) || 60)}
                          min="15"
                          step="15"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="service-price">Price ($)</Label>
                        <Input
                          id="service-price"
                          type="number"
                          value={servicePrice}
                          onChange={(e) => setServicePrice(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service-location">Location</Label>
                      <Input
                        id="service-location"
                        value={serviceLocation}
                        onChange={(e) => setServiceLocation(e.target.value)}
                        placeholder="e.g., Office, Conference Room"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service-color">Color</Label>
                      <Input
                        id="service-color"
                        type="color"
                        value={serviceColor}
                        onChange={(e) => setServiceColor(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setServiceDialogOpen(false);
                        setEditingService(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleServiceSubmit}>
                      {editingService ? 'Update Service' : 'Create Service'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {services.map((service) => (
                  <Card key={service.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: service.color }}
                          />
                          <div>
                            <h3 className="font-semibold">{service.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {service.description}
                            </p>
                            <div className="flex space-x-4 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {service.duration_minutes} minutes
                              </span>
                              {service.price && (
                                <span className="text-xs text-muted-foreground">
                                  ${service.price}
                                </span>
                              )}
                              {service.location && (
                                <span className="text-xs text-muted-foreground">
                                  {service.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditService(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteService(service.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Appointment Details Dialog */}
      {selectedAppointment && (
        <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client</Label>
                <p className="font-medium">{selectedAppointment.client_name}</p>
                <p className="text-sm text-muted-foreground">{selectedAppointment.client_email}</p>
                {selectedAppointment.client_phone && (
                  <p className="text-sm text-muted-foreground">{selectedAppointment.client_phone}</p>
                )}
              </div>
              
              <div>
                <Label>Service</Label>
                <p className="font-medium">{selectedAppointment.service?.name}</p>
              </div>
              
              <div>
                <Label>Date & Time</Label>
                <p className="font-medium">
                  {format(parseISO(selectedAppointment.appointment_date), 'EEEE, MMMM do, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedAppointment.start_time} - {selectedAppointment.end_time}
                </p>
              </div>
              
              {selectedAppointment.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};