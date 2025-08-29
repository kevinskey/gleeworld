import React, { useState } from 'react';
import { Calendar, Settings, List, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppointmentTypesManager } from './AppointmentTypesManager';
import { AvailabilitySettings } from './AvailabilitySettings';
import { AppointmentsOverview } from './AppointmentsOverview';

export const AppointmentAdminDashboard = () => {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Appointment Management</h1>
          <p className="text-muted-foreground">
            Manage appointment types, availability, and bookings
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Appointment Types
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Availability Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AppointmentsOverview />
        </TabsContent>

        <TabsContent value="types" className="mt-6">
          <AppointmentTypesManager />
        </TabsContent>

        <TabsContent value="availability" className="mt-6">
          <AvailabilitySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};