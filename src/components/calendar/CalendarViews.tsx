import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { CalendarViewSelector } from "./CalendarViewSelector";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { EventsList } from "./EventsList";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { CalendarManager } from "./CalendarManager";
import { CalendarFilterStrip } from "./CalendarFilterStrip";
import { CreateEventDialog } from "./CreateEventDialog";
import { AppointmentsList } from "@/components/appointments/AppointmentsList";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";

export const CalendarViews = () => {
  const [activeView, setActiveView] = useState("month");
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[]>([]);
  const navigate = useNavigate();
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
  const filteredEvents = events.filter(event => {
    return visibleCalendarIds.length === 0 || visibleCalendarIds.includes(event.calendar_id);
  });

  if (loading) {
    return (
      <Card className="border border-border/50">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-foreground">Calendar</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading events...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Card className="border border-border/50 bg-card">
          <CardContent className="p-3 sm:p-4">
            <div className="relative">
              {/* Header with View Selector and Actions */}
              <div className="flex flex-col gap-3 px-2 sm:px-4 py-3 sm:py-4 mb-3 sm:mb-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Calendar</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarViewSelector 
                      activeView={activeView} 
                      onViewChange={setActiveView}
                    />
                  </div>
                </div>
                {/* Quick Actions integrated into header */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-primary/30 hover:bg-primary/10"
                        onClick={() => navigate('/calendar/settings')}
                      >
                        <Clock className="h-4 w-4" />
                        <span className="text-xs sm:text-sm">My Availability</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Set your appointment availability</p>
                    </TooltipContent>
                  </Tooltip>
                  {isExecMember && (
                    <CreateEventDialog onEventCreated={fetchEvents} />
                  )}
                </div>
              </div>
              
              {/* Content Area */}
              <div className="mt-2 sm:mt-3">
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
        {isAdmin && (
          <Card className="border border-border/50">
            <CardHeader className="p-3 sm:p-4">
              <div className="bg-muted/30 border border-border/50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                  <h3 className="text-sm sm:text-base font-semibold text-foreground">Admin Controls</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
        
        {/* Appointments Section */}
        {isAdmin && <AppointmentsList />}
      </div>
    </TooltipProvider>
  );
};
