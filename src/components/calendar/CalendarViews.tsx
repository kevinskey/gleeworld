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
import { CalendarFilterStrip } from "./CalendarFilterStrip";
import { CreateEventDialog } from "./CreateEventDialog";
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
    <div className="space-y-4">
      <Card className="glass-dashboard-card">
        <CardHeader className="pb-0 pt-2">
          {/* Member Controls */}
          <div className="bg-muted/30 rounded-lg py-3 px-6 border border-border/50">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Member Controls</h3>
            </div>
            <div className="flex flex-nowrap gap-1 w-full">
              <div className="flex-1 min-w-0">
                <AppointmentScheduler />
              </div>
              {user && (
                <div className="flex-none">
                  <CreateEventDialog onEventCreated={fetchEvents} />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-4 pt-2">
          <Tabs value={activeView} onValueChange={setActiveView}>
            <TabsList className="grid w-full grid-cols-3 h-8 md:h-10">
              <TabsTrigger value="month" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2">
                <Grid3X3Icon className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Month</span>
                <span className="sm:hidden">Mo</span>
              </TabsTrigger>
              <TabsTrigger value="week" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2">
                <CalendarIcon className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Week</span>
                <span className="sm:hidden">Wk</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2">
                <ListIcon className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">List</span>
                <span className="sm:hidden">Li</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="month" className="mt-2 md:mt-3">
              <MonthlyCalendar events={filteredEvents} onEventUpdated={fetchEvents} />
            </TabsContent>
            
            <TabsContent value="week" className="mt-2 md:mt-3">
              <WeeklyCalendar events={filteredEvents} onEventUpdated={fetchEvents} />
            </TabsContent>
            
            <TabsContent value="list" className="mt-2 md:mt-3">
              <EventsList events={filteredEvents} onEventUpdated={fetchEvents} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Calendar Filter Strip */}
      <CalendarFilterStrip onCalendarsChange={setVisibleCalendarIds} />
      
      {/* Admin Controls */}
      {isAdmin && (
        <Card className="glass-dashboard-card">
          <CardHeader className="pb-0 pt-2">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-medium text-primary">Admin Controls</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10">
                      <Plus className="h-4 w-4 mr-2" />
                      Manage Calendars
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <CalendarManager />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}
      
      {/* Appointments Section - Only visible to admins, super-admins, and secretaries */}
      {isAdmin && <AppointmentsList />}
      
      {/* Export Button */}
      <div className="flex justify-center">
        <CalendarExport />
      </div>
    </div>
  );
};