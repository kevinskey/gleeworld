import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, ListIcon, Grid3X3Icon } from "lucide-react";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { EventsList } from "./EventsList";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { CreateEventDialog } from "@/components/events/CreateEventDialog";
import { AppointmentScheduler } from "@/components/appointments/AppointmentScheduler";
import { AppointmentsList } from "@/components/appointments/AppointmentsList";

import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

export const CalendarViews = () => {
  const [activeView, setActiveView] = useState("month");
  const { events, loading, fetchEvents } = useGleeWorldEvents();
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <span className="hidden sm:inline">Glee World Calendar</span>
            <span className="sm:hidden">Calendar</span>
          </CardTitle>
          <div className="flex gap-2 mt-1 sm:mt-0">
            <AppointmentScheduler />
            {user && <CreateEventDialog onEventCreated={fetchEvents} />}
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
            <MonthlyCalendar events={events} onEventUpdated={fetchEvents} />
          </TabsContent>
          
          <TabsContent value="week" className="mt-2 md:mt-3">
            <WeeklyCalendar events={events} onEventUpdated={fetchEvents} />
          </TabsContent>
          
          <TabsContent value="list" className="mt-2 md:mt-3">
            <EventsList events={events} onEventUpdated={fetchEvents} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    
    {/* Appointments Section - Only visible to admins, super-admins, and secretaries */}
    {isAdmin && <AppointmentsList />}
    </div>
  );
};