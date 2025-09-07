import React, { useState } from 'react';
import { Calendar, Clock, Users, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppointmentCalendar } from './AppointmentCalendar';
import { AppointmentManager } from './AppointmentManager';
import { AppointmentServiceManager } from './AppointmentServiceManager';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { 
  useRealAppointments, 
  useCreateRealAppointment, 
  useUpdateRealAppointment, 
  useDeleteRealAppointment,
  type Appointment 
} from '@/hooks/useRealAppointments';
import { useCalendars } from '@/hooks/useCalendars';

export const ComprehensiveAppointmentSystem = () => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Use real appointments data
  const { data: appointments = [], isLoading, error } = useRealAppointments();
  const { data: calendars = [] } = useCalendars();
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Appointment System</h1>
          <p className="text-muted-foreground">Complete appointment scheduling and management platform</p>
        </div>
        
        <div className="flex gap-2">
          <select className="px-3 py-2 border rounded-md text-sm">
            <option value="">All Calendars</option>
            {calendars.map(calendar => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{todayAppointments}</p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{weeklyAppointments}</p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{pendingAppointments}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{confirmedAppointments}</p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="management">Appointment Management</TabsTrigger>
          <TabsTrigger value="services">Service Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <AppointmentCalendar
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
          />
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <AppointmentServiceManager />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Status Distribution</CardTitle>
                <CardDescription>Breakdown of appointment statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { status: 'Confirmed', count: confirmedAppointments, color: 'bg-green-500' },
                    { status: 'Pending', count: pendingAppointments, color: 'bg-yellow-500' },
                    { status: 'Completed', count: appointments.filter(a => a.status === 'completed').length, color: 'bg-blue-500' },
                    { status: 'Cancelled', count: appointments.filter(a => a.status === 'cancelled').length, color: 'bg-red-500' },
                  ].map(item => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span>{item.status}</span>
                      </div>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Popular Services</CardTitle>
                <CardDescription>Most booked services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    appointments.reduce((acc, apt) => {
                      acc[apt.service] = (acc[apt.service] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([service, count]) => (
                      <div key={service} className="flex items-center justify-between">
                        <span>{service}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};