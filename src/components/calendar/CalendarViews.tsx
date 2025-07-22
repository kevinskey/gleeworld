import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, ListIcon, Grid3X3Icon, Plus } from "lucide-react";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { EventsList } from "./EventsList";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { CalendarExport } from "./CalendarExport";
import { CalendarToggle } from "./CalendarToggle";
import { CalendarManager } from "./CalendarManager";
import { CreateEventDialog } from "@/components/events/CreateEventDialog";
import { AppointmentScheduler } from "@/components/appointments/AppointmentScheduler";
import { AppointmentsList } from "@/components/appointments/AppointmentsList";

import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

export const CalendarViews = () => {
  const [activeView, setActiveView] = useState("month");
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[]>([]);
  const { events, loading, fetchEvents } = useGleeWorldEvents();
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';

  // Filter events based on visible calendars
  const filteredEvents = events.filter(event => 
    visibleCalendarIds.length === 0 || visibleCalendarIds.includes(event.calendar_id)
  );

  if (loading) {
    return (
      <Card className="glass-dashboard-card">
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading events...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
        <p className="text-muted-foreground">Manage events, appointments, and schedules</p>
      </div>

      {/* Controls Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Member Controls */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary"></div>
              Member Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <CalendarToggle onCalendarsChange={setVisibleCalendarIds} />
              <CalendarExport />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AppointmentScheduler />
              {user && <CreateEventDialog onEventCreated={fetchEvents} />}
            </div>
          </CardContent>
        </Card>

        {/* Admin Controls */}
        {isAdmin && (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                Admin Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Manage Calendars
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <CalendarManager />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Calendar Views */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/10">
        <CardContent className="p-6">
          <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50">
              <TabsTrigger 
                value="month" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Grid3X3Icon className="h-4 w-4" />
                <span>Month</span>
              </TabsTrigger>
              <TabsTrigger 
                value="week" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>Week</span>
              </TabsTrigger>
              <TabsTrigger 
                value="list" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <ListIcon className="h-4 w-4" />
                <span>List</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="rounded-lg border bg-background/50 p-4">
              <TabsContent value="month" className="mt-0">
                <MonthlyCalendar events={filteredEvents} onEventUpdated={fetchEvents} />
              </TabsContent>
              
              <TabsContent value="week" className="mt-0">
                <WeeklyCalendar events={filteredEvents} onEventUpdated={fetchEvents} />
              </TabsContent>
              
              <TabsContent value="list" className="mt-0">
                <EventsList events={filteredEvents} onEventUpdated={fetchEvents} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Appointments Section */}
      {isAdmin && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              Appointments Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentsList />
          </CardContent>
        </Card>
      )}
    </div>
  );
};