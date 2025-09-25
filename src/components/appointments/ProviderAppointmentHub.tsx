import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EnhancedAppointmentCalendar } from './EnhancedAppointmentCalendar';
import { AppointmentManager } from './AppointmentManager';
import { format, addDays, startOfWeek, addWeeks, isToday, isTomorrow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { 
  useRealAppointments, 
  useCreateRealAppointment, 
  useUpdateRealAppointment, 
  useDeleteRealAppointment,
  type Appointment 
} from '@/hooks/useRealAppointments';
import { useServiceProviders } from '@/hooks/useServiceProviders';

interface ProviderAppointmentHubProps {
  providerId?: string;
  providerInfo?: any;
}

export const ProviderAppointmentHub = ({ providerId, providerInfo }: ProviderAppointmentHubProps = {}) => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { data: providers = [] } = useServiceProviders();
  
  // Find current user's provider profile or use provided provider
  const currentProvider = providerInfo ? 
    { 
      ...providerInfo, 
      provider_name: providerInfo.full_name || providerInfo.first_name,
      department: 'Music Department',
      services_offered: ['general', 'consultation', 'voice-lesson', 'tutorial'],
      is_active: true,
      title: 'Dr.'
    } : 
    providers.find(p => p.user_id === user?.id);
  
  // Use real appointments data
  const { data: allAppointments = [], isLoading, error } = useRealAppointments();
  const createMutation = useCreateRealAppointment();
  const updateMutation = useUpdateRealAppointment();
  const deleteMutation = useDeleteRealAppointment();

  // Filter appointments to only show those for the current provider
  // RLS policies now handle this filtering automatically at the database level
  const providerAppointments = useMemo(() => {
    return allAppointments;
  }, [allAppointments]);

  // Stats calculations for provider's appointments only
  const todayAppointments = providerAppointments.filter(apt => {
    return isToday(apt.date);
  }).length;

  const weeklyAppointments = providerAppointments.filter(apt => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = addWeeks(weekStart, 1);
    return apt.date >= weekStart && apt.date < weekEnd;
  }).length;

  const pendingAppointments = providerAppointments.filter(apt => apt.status === 'pending').length;
  const confirmedAppointments = providerAppointments.filter(apt => apt.status === 'confirmed').length;

  // Upcoming appointments for quick view
  const upcomingAppointments = providerAppointments
    .filter(apt => apt.date >= new Date() && apt.status === 'confirmed')
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  // Event handlers using mutations
  const handleAppointmentCreate = (newAppointment: Omit<Appointment, 'id'>) => {
    // Provider assignment is now handled automatically in the backend
    createMutation.mutate(newAppointment);
  };

  const handleAppointmentUpdate = (id: string, updates: Partial<Appointment>) => {
    updateMutation.mutate({ id, updates });
  };

  const handleAppointmentDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Error loading appointments: {error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Show setup message if user is not a provider
  if (!currentProvider) {
    return (
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Provider Setup Required</h3>
            <p className="text-muted-foreground mb-4">
              You need to set up your provider profile before you can manage appointments.
            </p>
            <Button onClick={() => navigate('/appointments')} className="mt-4">
              Set Up Provider Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6">
      {/* Header with Provider Info */}
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4 lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
              {providerInfo ? `${providerInfo.first_name}'s Appointment Center` : 'My Appointment Center'}
            </h1>
            <p className="text-sm lg:text-base text-muted-foreground">
              {currentProvider.title} {currentProvider.provider_name} - {currentProvider.department}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            {currentProvider.services_offered.join(' • ')}
          </Badge>
          <Badge 
            variant={currentProvider.is_active ? "default" : "destructive"}
            className="text-sm"
          >
            {currentProvider.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <Calendar className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg lg:text-2xl font-bold">{todayAppointments}</p>
                <p className="text-xs lg:text-sm text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <Users className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg lg:text-2xl font-bold">{weeklyAppointments}</p>
                <p className="text-xs lg:text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg lg:text-2xl font-bold">{pendingAppointments}</p>
                <p className="text-xs lg:text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg lg:text-2xl font-bold">{confirmedAppointments}</p>
                <p className="text-xs lg:text-sm text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
            <CardDescription>Your next confirmed appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div 
                  key={appointment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedAppointment(appointment)}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(appointment.status)}
                    <div>
                      <p className="font-medium">{appointment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(appointment.date, 'MMM dd, yyyy')} at {appointment.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                    {isToday(appointment.date) && (
                      <Badge variant="outline" className="text-xs">Today</Badge>
                    )}
                    {isTomorrow(appointment.date) && (
                      <Badge variant="outline" className="text-xs">Tomorrow</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4 lg:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full min-w-fit gap-1 grid-cols-3 lg:grid lg:w-full">
            <TabsTrigger value="calendar" className="text-xs lg:text-sm whitespace-nowrap">Calendar View</TabsTrigger>
            <TabsTrigger value="management" className="text-xs lg:text-sm whitespace-nowrap">Manage Appointments</TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs lg:text-sm whitespace-nowrap">My Schedule</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calendar" className="space-y-6">
          <EnhancedAppointmentCalendar
            appointments={providerAppointments}
            onAppointmentSelect={setSelectedAppointment}
          />
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <AppointmentManager
            appointments={providerAppointments}
            onAppointmentCreate={handleAppointmentCreate}
            onAppointmentUpdate={handleAppointmentUpdate}
            onAppointmentDelete={handleAppointmentDelete}
            editingAppointmentId={editingAppointmentId}
            onEditingAppointmentIdChange={setEditingAppointmentId}
          />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>
                  {format(new Date(), 'EEEE, MMMM dd, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {providerAppointments
                  .filter(apt => isToday(apt.date))
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((appointment) => (
                    <div 
                      key={appointment.id}
                      className="flex items-center justify-between p-4 border rounded-lg mb-3 last:mb-0"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(appointment.status)}
                        <div>
                          <p className="font-medium">{appointment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.time} • {appointment.clientName}
                          </p>
                          {appointment.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{appointment.notes}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                  ))}
                {providerAppointments.filter(apt => isToday(apt.date)).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No appointments scheduled for today
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>This Week Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                    const date = addDays(startOfWeek(new Date()), dayOffset);
                    const dayAppointments = providerAppointments.filter(apt => 
                      apt.date.toDateString() === date.toDateString()
                    );
                    
                    return (
                      <div key={dayOffset} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{format(date, 'EEEE')}</p>
                          <p className="text-sm text-muted-foreground">{format(date, 'MMM dd')}</p>
                        </div>
                        <Badge variant="outline">
                          {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Appointment Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg lg:text-xl">
              Appointment Details - {selectedAppointment?.title || 'Unknown'}
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date & Time</label>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedAppointment.date, 'MMM dd, yyyy')} at {selectedAppointment.time}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedAppointment.status)}
                    <Badge className={getStatusColor(selectedAppointment.status)}>
                      {selectedAppointment.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Client</label>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.clientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Service</label>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.service}</p>
                </div>
              </div>
              {selectedAppointment.notes && (
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedAppointment.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => {
                    setEditingAppointmentId(selectedAppointment.id);
                    setSelectedAppointment(null);
                  }}
                >
                  Edit Appointment
                </Button>
                <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};