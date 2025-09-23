import React, { useState, useMemo } from 'react';
import { useUserAppointments } from '@/hooks/useAppointments';
import { useCurrentProvider } from '@/hooks/useServiceProviders';
import { AppointmentCalendarView } from './AppointmentCalendarView';
import { ProviderStatsCards } from './ProviderStatsCards';
import { CalendarSyncSection } from './CalendarSyncSection';
import { ProviderAppointmentList } from './ProviderAppointmentList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Clock, TrendingUp, ExternalLink } from 'lucide-react';
import { isToday, isThisWeek, startOfDay, endOfDay } from 'date-fns';

export const ProviderAppointmentDashboard = () => {
  const { data: appointments = [], isLoading } = useUserAppointments();
  const { data: provider } = useCurrentProvider();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Filter appointments for the current provider
  const providerAppointments = useMemo(() => {
    if (!provider) return [];
    return appointments.filter(apt => apt.assigned_to === provider.user_id);
  }, [appointments, provider]);

  // Calculate stats
  const todayAppointments = providerAppointments.filter(apt => 
    isToday(new Date(apt.appointment_date))
  );

  const weekAppointments = providerAppointments.filter(apt => 
    isThisWeek(new Date(apt.appointment_date))
  );

  const upcomingAppointments = providerAppointments.filter(apt => 
    new Date(apt.appointment_date) > new Date() && apt.status === 'confirmed'
  );

  const selectedDateAppointments = providerAppointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date);
    return aptDate >= startOfDay(selectedDate) && aptDate <= endOfDay(selectedDate);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <CalendarIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Provider Profile Required</h3>
            <p>You need to set up a service provider profile to access appointment management.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with provider info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Appointment Calendar</h1>
          <p className="text-muted-foreground">
            Welcome back, {provider.provider_name} - {provider.department}
          </p>
        </div>
        <CalendarSyncSection />
      </div>

      {/* Stats Cards */}
      <ProviderStatsCards 
        todayCount={todayAppointments.length}
        weekCount={weekAppointments.length}
        upcomingCount={upcomingAppointments.length}
        totalAppointments={providerAppointments.length}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Calendar View</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Calendar view will be available soon.</p>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDateAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDateAppointments.map((apt) => (
                        <div key={apt.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{apt.client_name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {new Date(apt.appointment_date).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {apt.appointment_type}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {apt.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No appointments scheduled for this date
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upcoming">
          <ProviderAppointmentList appointments={upcomingAppointments} />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>This Week's Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Appointments</span>
                    <span className="font-medium">{weekAppointments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confirmed</span>
                    <span className="font-medium text-green-600">
                      {weekAppointments.filter(apt => apt.status === 'confirmed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <span className="font-medium text-yellow-600">
                      {weekAppointments.filter(apt => apt.status === 'pending').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors">
                  <span>Export Calendar</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors">
                  <span>Sync with Google Calendar</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors">
                  <span>Download Appointment Report</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};