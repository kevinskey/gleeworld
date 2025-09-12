import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { CallMeetingDialog } from "./CallMeetingDialog";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
export const CalendarViews = () => {
  const [activeView, setActiveView] = useState("month");
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[]>([]);
  const {
    events,
    loading,
    fetchEvents
  } = useGleeWorldEvents();
  const {
    user
  } = useAuth();
  const {
    profile
  } = useProfile();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
  const isExecMember = profile?.role === 'executive' || isAdmin;

  // Filter events based on visible calendars
  // Show all events if no specific calendars are selected, or if the event's calendar is selected
  const filteredEvents = events.filter(event => {
    return visibleCalendarIds.length === 0 || visibleCalendarIds.includes(event.calendar_id);
  });
  console.log('Total events:', events.length, 'Filtered events:', filteredEvents.length, 'Filtered events:', filteredEvents.map(e => e.title));
  console.log('visibleCalendarIds:', visibleCalendarIds);
  if (loading) {
    return <Card className="glass-dashboard-card">
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading events...</div>
          </div>
        </CardContent>
      </Card>;
  }
  return <TooltipProvider>
      <div className="space-y-4">
        <Card className="glass-dashboard-card">
          <CardHeader className="p-0">
            {/* Member Controls */}
            <div className="bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center justify-between gap-2 p-2">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Member Controls</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3 w-full">
                <div className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full max-w-[120px]">
                        <AppointmentScheduler />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Schedule a Glee Club audition appointment</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {isExecMember && <div className="flex justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full max-w-[120px]">
                          <CreateEventDialog onEventCreated={fetchEvents} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Create a new event for the calendar</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>}
                {isExecMember}
              </div>
            </div>
          </CardHeader>
        <CardContent className="px-0 pt-2 pb-0 md:px-1.5">
          <div className="relative">
            {/* Mobile Header with View Selector */}
            <div className="md:hidden bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50 px-4 py-3 mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Calendar</h2>
                <div className="flex bg-muted rounded-full p-1">
                  <Button
                    variant={activeView === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('month')}
                    className="rounded-full px-3 py-1 text-xs h-8"
                  >
                    Month
                  </Button>
                  <Button
                    variant={activeView === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('week')}
                    className="rounded-full px-3 py-1 text-xs h-8"
                  >
                    Week
                  </Button>
                  <Button
                    variant={activeView === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('list')}
                    className="rounded-full px-3 py-1 text-xs h-8"
                  >
                    List
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden md:block">
              <Tabs value={activeView} onValueChange={setActiveView}>
                <TabsList className="grid w-full grid-cols-3 h-10 gap-1">
                  <TabsTrigger value="month" className="flex items-center justify-center gap-1">
                    <Grid3X3Icon className="h-4 w-4" />
                    Month
                  </TabsTrigger>
                  <TabsTrigger value="week" className="flex items-center justify-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    Week
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center justify-center gap-1">
                    <ListIcon className="h-4 w-4" />
                    List
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Content Area */}
            <div className="px-2 md:px-0 md:mt-3">
              {activeView === 'month' && (
                <div className="animate-fade-in">
                  <MonthlyCalendar events={filteredEvents} onEventUpdated={fetchEvents} />
                </div>
              )}
              
              {activeView === 'week' && (
                <div className="animate-fade-in">
                  <WeeklyCalendar events={filteredEvents} onEventUpdated={fetchEvents} />
                </div>
              )}
              
              {activeView === 'list' && (
                <div className="animate-fade-in">
                  <EventsList events={filteredEvents} onEventUpdated={fetchEvents} />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Calendar Filter Strip */}
      <CalendarFilterStrip onCalendarsChange={setVisibleCalendarIds} />
      
      {/* Admin Controls */}
      {isAdmin && <Card className="glass-dashboard-card">
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
        </Card>}
      
      {/* Appointments Section - Only visible to admins, super-admins, and secretaries */}
      {isAdmin && <AppointmentsList />}
      
      {/* Export Button */}
      <div className="flex justify-center">
        <CalendarExport />
      </div>
    </div>
    </TooltipProvider>;
};