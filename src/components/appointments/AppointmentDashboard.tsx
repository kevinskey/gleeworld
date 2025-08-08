import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Settings, History, RotateCcw } from 'lucide-react';
import { AppointmentsList } from './AppointmentsList';
import { AppointmentScheduler } from './AppointmentScheduler';
import { AppointmentCalendarView } from './AppointmentCalendarView';
import { AppointmentTypeManager } from './AppointmentTypeManager';
import { AppointmentAvailabilityManager } from './AppointmentAvailabilityManager';
import { AppointmentHistory } from './AppointmentHistory';
import { AppointmentCalendarSync } from './AppointmentCalendarSync';
import { useAuth } from '@/contexts/AuthContext';

export const AppointmentDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointment Management</h1>
          <p className="text-muted-foreground">
            Manage appointments, availability, and calendar synchronization
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <AppointmentCalendarView />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">+2 from last week</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-xs text-muted-foreground">Next: 2:30 PM</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">+12% from last week</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calendar Sync</CardTitle>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">98%</div>
                <p className="text-xs text-muted-foreground">Sync success rate</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Appointments</CardTitle>
              <CardDescription>
                Your upcoming and recent appointment activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule New Appointment</CardTitle>
              <CardDescription>
                Create new appointments and manage existing ones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentScheduler />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Availability Management</CardTitle>
              <CardDescription>
                Set your availability schedule and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentAvailabilityManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Types</CardTitle>
              <CardDescription>
                Manage appointment types, durations, and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentTypeManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment History</CardTitle>
              <CardDescription>
                View appointment history and activity logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentHistory />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Synchronization</CardTitle>
              <CardDescription>
                Sync appointments with Google Calendar, Apple Calendar, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentCalendarSync />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};