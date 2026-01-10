import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, Settings, CalendarIcon } from "lucide-react";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { CalendarManager } from "./CalendarManager";
import { CalendarFilterStrip } from "./CalendarFilterStrip";
import { CreateEventDialog } from "./CreateEventDialog";
import { DayAgendaPanel } from "./DayAgendaPanel";
import { OfficeHoursBooking } from "./OfficeHoursBooking";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { format, isSameDay, addMonths, subMonths } from "date-fns";

export const CalendarViews = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  // null = not initialized yet (show all), [] = user intentionally hid all
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[] | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const navigate = useNavigate();
  const { events, loading, fetchEvents } = useGleeWorldEvents();
  const { user } = useAuth();
  const { isAdmin, isExecutiveBoard, loading: roleLoading } = useUserRole();
  const canManageEvents = !roleLoading && (isAdmin() || isExecutiveBoard());

  // Filter events based on visible calendars
  const filteredEvents = useMemo(() => {
    if (visibleCalendarIds === null) return events;
    if (visibleCalendarIds.length === 0) return [];
    return events.filter((event) => visibleCalendarIds.includes(event.calendar_id));
  }, [events, visibleCalendarIds]);

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
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 rounded-xl">
        <div className="flex flex-col items-center gap-3">
          <CalendarIcon className="w-12 h-12 text-slate-300 animate-pulse" />
          <p className="text-slate-500 font-medium">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 rounded-xl">
      {/* Header Bar - Compact on tablet */}
      <div className="bg-slate-900 text-white px-3 md:px-4 py-2 md:py-3 flex items-center justify-between flex-shrink-0 rounded-t-xl">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Icon + Title - hidden on smaller tablets */}
          <div className="hidden md:flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            <h1 className="text-lg font-bold tracking-tight">Calendar</h1>
          </div>
          
          {/* Month Navigation - always visible, compact */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigateMonth('prev')} 
              className="h-7 w-7 text-white hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm md:text-base font-semibold min-w-[100px] md:min-w-[130px] text-center">
              {format(currentDate, 'MMM yyyy')}
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigateMonth('next')} 
              className="h-7 w-7 text-white hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Actions - compact on tablet */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <OfficeHoursBooking selectedDate={selectedDate} />
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-7 md:h-8 text-xs md:text-sm font-medium px-2 md:px-3"
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDate(new Date());
            }}
          >
            Today
          </Button>
          <Button 
            size="sm" 
            className="gap-1.5 h-7 md:h-8 text-xs md:text-sm font-medium bg-primary hover:bg-primary/90 px-2 md:px-3" 
            onClick={() => setShowCreateEvent(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar - Hidden on tablet (md), shown on desktop (lg+) */}
      <div className="hidden lg:block bg-slate-100 border-b border-slate-200 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CalendarFilterStrip
            onCalendarsChange={setVisibleCalendarIds}
            onCalendarColorUpdated={fetchEvents}
          />
          {canManageEvents && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/calendar/settings')} 
                className="h-7 w-7 text-slate-600 hover:text-slate-900"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-slate-900">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
                  <CalendarManager />
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Main Content - Two columns on tablet (md+), stacked on mobile */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-3 flex-1 min-h-0 p-2 md:p-3">
        {/* Calendar Grid - Takes more space */}
        <div className="flex-1 md:flex-[2] min-h-0">
          <MonthlyCalendar 
            events={filteredEvents} 
            onEventUpdated={fetchEvents} 
            currentDate={currentDate} 
            selectedDate={selectedDate} 
            onDateSelect={setSelectedDate} 
            onMonthChange={setCurrentDate} 
          />
        </div>

        {/* Day Agenda Panel - Narrower sidebar on tablet */}
        <div className="md:w-56 lg:w-72 xl:w-80 flex-shrink-0 max-h-[30vh] md:max-h-none">
          <DayAgendaPanel 
            selectedDate={selectedDate} 
            events={selectedDateEvents} 
            onEventClick={event => console.log('Event clicked:', event)} 
          />
        </div>
      </div>

      {/* Create Event Dialog */}
      <CreateEventDialog 
        open={showCreateEvent}
        onOpenChange={setShowCreateEvent}
        onEventCreated={() => {
          setShowCreateEvent(false);
          fetchEvents();
        }} 
        initialDate={selectedDate} 
      />
    </div>
  );
};