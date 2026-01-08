import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { CalendarManager } from "./CalendarManager";
import { CalendarFilterStrip } from "./CalendarFilterStrip";
import { CreateEventDialog } from "./CreateEventDialog";
import { DayAgendaPanel } from "./DayAgendaPanel";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { format, isSameDay, addMonths, subMonths } from "date-fns";
export const CalendarViews = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
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
    // Only show events from selected calendars
    return visibleCalendarIds.includes(event.calendar_id);
  });

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, selectedDate);
    });
  }, [filteredEvents, selectedDate]);
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };
  if (loading) {
    return <Card className="border border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading calendar...</div>
          </div>
        </CardContent>
      </Card>;
  }
  return <div className="flex flex-col h-full overflow-hidden">
      {/* Main Calendar Layout */}
      <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 flex-1 min-h-0">
        {/* Calendar Grid Section */}
        <div className="flex-1 lg:flex-[3] flex flex-col min-h-0">
          <Card className="border border-border/50 bg-card flex-1 flex flex-col min-h-0">
            <CardContent className="p-2 sm:p-3 md:p-4 flex flex-col flex-1 min-h-0">
              {/* Calendar Header - compact */}
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                    Calendar
                  </h1>
                  <div className="h-5 w-px bg-border" />
                  <h2 className="text-sm sm:text-base md:text-lg font-semibold text-foreground">
                    {format(currentDate, 'MMM yyyy')}
                  </h2>
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')} className="h-6 w-6 sm:h-7 sm:w-7">
                      <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')} className="h-6 w-6 sm:h-7 sm:w-7">
                      <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Button variant="outline" size="sm" className="h-6 sm:h-7 text-xs px-2" onClick={() => {
                    setCurrentDate(new Date());
                    setSelectedDate(new Date());
                  }}>
                    Today
                  </Button>
                  {isAdmin && <Button size="sm" className="gap-1 h-6 sm:h-7 text-xs px-2" onClick={() => setShowCreateEvent(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">New</span>
                  </Button>}
                </div>
              </div>

               {/* Calendar Filters - inline on mobile */}
               <div className="flex items-center gap-1 mb-2 flex-shrink-0">
                 <CalendarFilterStrip
                   onCalendarsChange={setVisibleCalendarIds}
                   onCalendarColorUpdated={fetchEvents}
                 />
                 {isAdmin && (
                   <>
                    <Button variant="ghost" size="icon" onClick={() => navigate('/calendar/settings')} className="h-6 w-6 flex-shrink-0">
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
                        <CalendarManager />
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>

              {/* Calendar Grid */}
              <div className="flex-1 min-h-0">
                <MonthlyCalendar events={filteredEvents} onEventUpdated={fetchEvents} currentDate={currentDate} selectedDate={selectedDate} onDateSelect={setSelectedDate} onMonthChange={setCurrentDate} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day Agenda Panel - collapsible on mobile, sidebar on desktop */}
        <div className="lg:w-64 xl:w-72 flex-shrink-0 max-h-[30vh] lg:max-h-none overflow-hidden">
          <DayAgendaPanel selectedDate={selectedDate} events={selectedDateEvents} onEventClick={event => {
          console.log('Event clicked:', event);
        }} />
        </div>
      </div>

      {/* Create Event Dialog - controlled by state */}
      <CreateEventDialog 
        open={showCreateEvent}
        onOpenChange={setShowCreateEvent}
        onEventCreated={() => {
          setShowCreateEvent(false);
          fetchEvents();
        }} 
        initialDate={selectedDate} 
      />
    </div>;
};