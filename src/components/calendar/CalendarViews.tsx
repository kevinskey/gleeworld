import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, Settings, CalendarIcon } from "lucide-react";
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
  const { events, loading, fetchEvents } = useGleeWorldEvents();
  const { user } = useAuth();
  const { profile } = useProfile();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';

  // Filter events based on visible calendars
  const filteredEvents = events.filter(event => {
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
      {/* Header Bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-xl">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 sm:w-7 sm:h-7" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Calendar</h1>
          </div>
          
          <div className="hidden sm:block h-6 w-px bg-slate-700" />
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigateMonth('prev')} 
              className="h-8 w-8 text-white hover:bg-slate-800"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg sm:text-xl font-semibold min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigateMonth('next')} 
              className="h-8 w-8 text-white hover:bg-slate-800"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-9 text-sm font-medium"
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDate(new Date());
            }}
          >
            Today
          </Button>
          {isAdmin && (
            <Button 
              size="sm" 
              className="gap-2 h-9 text-sm font-medium bg-primary hover:bg-primary/90" 
              onClick={() => setShowCreateEvent(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Event</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CalendarFilterStrip
            onCalendarsChange={setVisibleCalendarIds}
            onCalendarColorUpdated={fetchEvents}
          />
          {isAdmin && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/calendar/settings')} 
                className="h-8 w-8 text-slate-600 hover:text-slate-900"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900">
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

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 p-4 sm:p-6">
        {/* Calendar Grid */}
        <div className="flex-1 lg:flex-[3] min-h-0">
          <MonthlyCalendar 
            events={filteredEvents} 
            onEventUpdated={fetchEvents} 
            currentDate={currentDate} 
            selectedDate={selectedDate} 
            onDateSelect={setSelectedDate} 
            onMonthChange={setCurrentDate} 
          />
        </div>

        {/* Day Agenda Panel */}
        <div className="lg:w-72 xl:w-80 flex-shrink-0 max-h-[35vh] lg:max-h-none">
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