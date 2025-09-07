import React, { useState } from 'react';
import { Calendar, Clock, Settings, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useCurrentProvider } from '@/hooks/useServiceProviders';
import { useRealAppointments } from '@/hooks/useRealAppointments';
import { ProviderCalendar } from './ProviderCalendar';
import { ProviderAvailabilityManager } from './ProviderAvailabilityManager';
import { ProviderSettings } from './ProviderSettings';
import { format, isToday, isTomorrow, addDays } from 'date-fns';

export const ProviderDashboard = () => {
  const { data: provider, isLoading } = useCurrentProvider();
  const { data: appointments = [] } = useRealAppointments();

  // Filter appointments for this provider (for now, show all appointments)
  // TODO: Add provider_id to Appointment type and filter properly
  const providerAppointments = appointments;

  // Stats calculations
  const todayAppointments = providerAppointments.filter(apt => 
    isToday(apt.date)
  ).length;

  const tomorrowAppointments = providerAppointments.filter(apt => 
    isTomorrow(apt.date)
  ).length;

  const thisWeekAppointments = providerAppointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    const weekFromNow = addDays(new Date(), 7);
    return appointmentDate >= new Date() && appointmentDate <= weekFromNow;
  }).length;

  const pendingAppointments = providerAppointments.filter(apt => 
    apt.status === 'pending'
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Provider Access Required</CardTitle>
            <CardDescription>
              You need to be set up as a service provider to access this dashboard.
              Please contact an administrator to configure your provider profile.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {provider.title} {provider.provider_name}</h1>
          <p className="text-muted-foreground">Manage your appointments and availability</p>
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
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{tomorrowAppointments}</p>
                <p className="text-sm text-muted-foreground">Tomorrow</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{thisWeekAppointments}</p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{pendingAppointments}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">My Calendar</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <ProviderCalendar 
            provider={provider}
            appointments={providerAppointments}
          />
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <ProviderAvailabilityManager provider={provider} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <ProviderSettings provider={provider} />
        </TabsContent>
      </Tabs>

      {/* Quick Actions for Today */}
      {todayAppointments > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>Your appointments for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {providerAppointments
                .filter(apt => isToday(apt.date))
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(apt => (
                  <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{apt.time} - {apt.clientName}</div>
                      <div className="text-sm text-muted-foreground">{apt.service}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {apt.duration} min
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};