import React, { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { AppointmentDashboard } from '@/components/appointments/AppointmentDashboard';
import { AppointmentCalendar } from '@/components/appointments/AppointmentCalendar';
import { AppointmentAvailability } from '@/components/appointments/AppointmentAvailability';
import { AppointmentSettings } from '@/components/appointments/AppointmentSettings';
import { AppointmentDialog } from '@/components/appointments/AppointmentDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Settings, BarChart3, Plus } from 'lucide-react';

export default function AppointmentScheduler() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Appointment Scheduler</h1>
            <p className="text-muted-foreground mt-1">
              Manage appointments, availability, and scheduling preferences
            </p>
          </div>
          <Button onClick={() => setShowNewAppointmentDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Availability
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <AppointmentDashboard />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <AppointmentCalendar />
          </TabsContent>

          <TabsContent value="availability" className="space-y-6">
            <AppointmentAvailability />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <AppointmentSettings />
          </TabsContent>
        </Tabs>

        {/* New Appointment Dialog */}
        <AppointmentDialog
          open={showNewAppointmentDialog}
          onOpenChange={setShowNewAppointmentDialog}
          selectedDate={new Date()}
        />
      </div>
    </UniversalLayout>
  );
}