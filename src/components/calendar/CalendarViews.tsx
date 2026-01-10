import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, Settings, CalendarIcon, Sparkles } from "lucide-react";
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
import { useTheme } from "@/contexts/ThemeContext";
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
  const { themeName } = useTheme();
  const canManageEvents = !roleLoading && (isAdmin() || isExecutiveBoard());
  
  const isSpelmanBlue = themeName === 'spelman-blue';

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
      {/* Header Bar - Matches Dashboard Header Style */}
      <div 
        className={`backdrop-blur-sm border-b border-border px-3 md:px-6 py-2 flex items-center justify-between flex-shrink-0 rounded-t-xl relative overflow-hidden ${
          isSpelmanBlue 
            ? 'bg-gradient-to-r from-[#0066CC] via-[#0077DD] to-[#0088EE]' 
            : 'bg-gradient-to-r from-primary/90 via-primary to-destructive/80'
        }`}
      >
        {/* Holiday sparkle accents - hide for Spelman Blue */}
        {!isSpelmanBlue && (
          <div className="absolute inset-0 pointer-events-none">
            <Sparkles className="absolute top-1 left-[10%] w-3 h-3 text-amber-400/60 animate-pulse" />
            <Sparkles className="absolute bottom-1 right-[20%] w-3 h-3 text-emerald-500/50 animate-pulse delay-500" />
          </div>
        )}
        <div className="flex items-center gap-2 md:gap-3 text-white">
          {/* Icon + Title - hidden on smaller tablets */}
          <div className="hidden md:flex items-center gap-1.5 text-white">
            <CalendarIcon className="w-4 h-4 text-white" />
            <h1 className="text-sm font-semibold tracking-tight text-white">Calendar</h1>
          </div>
          
          {/* Month Navigation - always visible, compact */}
          <div className="flex items-center gap-0.5">
            <button 
              onClick={() => navigateMonth('prev')} 
              className="h-6 w-6 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-90 active:bg-white/20 transition-all duration-150"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs md:text-sm font-medium min-w-[80px] md:min-w-[100px] text-center text-white">
              {format(currentDate, 'MMM yyyy')}
            </span>
            <button 
              onClick={() => navigateMonth('next')} 
              className="h-6 w-6 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-90 active:bg-white/20 transition-all duration-150"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Actions - pill buttons with press animation */}
        <div className="flex items-center gap-1.5">
          <OfficeHoursBooking selectedDate={selectedDate} />
          <button 
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDate(new Date());
            }}
            className="h-6 px-3 rounded-full text-[10px] md:text-xs font-medium bg-white/20 text-white hover:bg-white/30 active:scale-95 active:bg-white/40 transition-all duration-150"
          >
            Today
          </button>
          <button 
            onClick={() => setShowCreateEvent(true)}
            className="h-6 px-3 rounded-full text-[10px] md:text-xs font-medium bg-white/20 text-white hover:bg-white/30 active:scale-95 active:bg-white/40 transition-all duration-150 flex items-center gap-1"
          >
            <Plus className="h-3 w-3 text-white" />
            <span className="hidden sm:inline">New</span>
          </button>
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