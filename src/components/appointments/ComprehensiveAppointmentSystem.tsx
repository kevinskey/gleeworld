import React, { useState } from 'react';
import { Calendar, Clock, Users, TrendingUp, BarChart3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EnhancedAppointmentCalendar } from './EnhancedAppointmentCalendar';
import { AppointmentManager } from './AppointmentManager';
import { AppointmentServiceManager } from './AppointmentServiceManager';
import { ProviderProfileSelector } from './ProviderProfileSelector';
import { ProviderManagement } from '@/components/admin/ProviderManagement';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  useRealAppointments, 
  useCreateRealAppointment, 
  useUpdateRealAppointment, 
  useDeleteRealAppointment,
  type Appointment 
} from '@/hooks/useRealAppointments';
import { useCalendars } from '@/hooks/useCalendars';
import { useServiceProviders } from '@/hooks/useServiceProviders';

export const ComprehensiveAppointmentSystem = () => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Use user role hook
  const { isSuperAdmin, isWardrobeManager } = useUserRole();
  
  // Check if user has admin access (super admin or wardrobe manager)
  const hasAdminAccess = isSuperAdmin() || isWardrobeManager();
  
  // Use real appointments data
  const { data: appointments = [], isLoading, error } = useRealAppointments();
  const { data: calendars = [] } = useCalendars();
  const { data: providers = [] } = useServiceProviders();
  const createMutation = useCreateRealAppointment();
  const updateMutation = useUpdateRealAppointment();
  const deleteMutation = useDeleteRealAppointment();

  // Stats calculations
  const todayAppointments = appointments.filter(apt => {
    const today = new Date();
    return apt.date.toDateString() === today.toDateString();
  }).length;

  const weeklyAppointments = appointments.filter(apt => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = addWeeks(weekStart, 1);
    return apt.date >= weekStart && apt.date < weekEnd;
  }).length;

  const pendingAppointments = appointments.filter(apt => apt.status === 'pending').length;
  const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmed').length;

  // Event handlers using mutations
  const handleAppointmentCreate = (newAppointment: Omit<Appointment, 'id'>) => {
    createMutation.mutate(newAppointment);
  };

  const handleAppointmentUpdate = (id: string, updates: Partial<Appointment>) => {
    updateMutation.mutate({ id, updates });
  };

  const handleAppointmentDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Listen for appointment edit requests from calendar
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'OPEN_APPOINTMENT_EDIT') {
        setEditingAppointmentId(event.data.appointmentId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading appointments...</p>
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

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6">
      {/* Header with Back Button */}
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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Appointment System</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Complete appointment scheduling and management platform</p>
          </div>
        </div>
        
        {hasAdminAccess && (
          <div className="flex gap-2">
            <select className="px-3 py-2 border rounded-md text-sm w-full min-w-0 lg:w-auto">
              <option value="">All Providers</option>
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.title} {provider.provider_name}
                </option>
              ))}
            </select>
          </div>
        )}
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
              <BarChart3 className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 flex-shrink-0" />
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
              <Users className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg lg:text-2xl font-bold">{confirmedAppointments}</p>
                <p className="text-xs lg:text-sm text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4 lg:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className={`inline-flex w-full min-w-fit gap-1 ${hasAdminAccess ? 'grid-cols-6' : 'grid-cols-4'} lg:grid lg:w-full`}>
            <TabsTrigger value="calendar" className="text-xs lg:text-sm whitespace-nowrap">Calendar</TabsTrigger>
            <TabsTrigger value="management" className="text-xs lg:text-sm whitespace-nowrap">Management</TabsTrigger>
            <TabsTrigger value="my-profile" className="text-xs lg:text-sm whitespace-nowrap">My Profile</TabsTrigger>
            <TabsTrigger value="services" className="text-xs lg:text-sm whitespace-nowrap">Services</TabsTrigger>
            {hasAdminAccess && (
              <>
                <TabsTrigger value="providers" className="text-xs lg:text-sm whitespace-nowrap">Providers</TabsTrigger>
                <TabsTrigger value="admin" className="text-xs lg:text-sm whitespace-nowrap">Admin</TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        <TabsContent value="calendar" className="space-y-6">
          <EnhancedAppointmentCalendar
            appointments={appointments}
            onAppointmentSelect={setSelectedAppointment}
          />
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <AppointmentManager
            appointments={appointments}
            onAppointmentCreate={handleAppointmentCreate}
            onAppointmentUpdate={handleAppointmentUpdate}
            onAppointmentDelete={handleAppointmentDelete}
            editingAppointmentId={editingAppointmentId}
            onEditingAppointmentIdChange={setEditingAppointmentId}
          />
        </TabsContent>

        <TabsContent value="my-profile" className="space-y-6">
          <ProviderProfileSelector />
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <AppointmentServiceManager />
        </TabsContent>

        {hasAdminAccess && (
          <TabsContent value="providers" className="space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {providers.map(provider => (
                <Card key={provider.id}>
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-start gap-3 mb-4">
                      {provider.profile_image_url ? (
                        <img 
                          src={provider.profile_image_url} 
                          alt={provider.provider_name}
                          className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm lg:text-base leading-tight">{provider.title} {provider.provider_name}</h3>
                        <p className="text-xs lg:text-sm text-muted-foreground mt-1">{provider.department}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs lg:text-sm">
                      <p className="break-all"><span className="font-medium">Email:</span> {provider.email}</p>
                      {provider.phone && <p><span className="font-medium">Phone:</span> {provider.phone}</p>}
                      <div className="min-w-0">
                        <span className="font-medium">Services:</span> 
                        <span className="ml-1 break-words">{provider.services_offered.join(', ')}</span>
                      </div>
                      <p><span className="font-medium">Status:</span> 
                        <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                          provider.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {provider.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {hasAdminAccess && (
          <TabsContent value="admin" className="space-y-6">
            <ProviderManagement />
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Appointment Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg lg:text-xl">Edit Appointment - {selectedAppointment?.title || 'Unknown'}</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="mt-4">
              <AppointmentManager
                appointments={[selectedAppointment]} // Only show the selected appointment
                onAppointmentCreate={handleAppointmentCreate}
                onAppointmentUpdate={(id: string, updates: Partial<Appointment>) => {
                  handleAppointmentUpdate(id, updates);
                  setSelectedAppointment(null); // Close dialog after update
                }}
                onAppointmentDelete={(id: string) => {
                  handleAppointmentDelete(id);
                  setSelectedAppointment(null); // Close dialog after delete
                }}
                editingAppointmentId={selectedAppointment.id}
                onEditingAppointmentIdChange={setEditingAppointmentId}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};