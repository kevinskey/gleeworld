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
    return visibleCalendarIds.length === 0 || visibleCalendarIds.includes(event.calendar_id);
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
  return <div className="space-y-4">
      {/* Main Calendar Layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar Grid Section */}
        <div className="flex-1">
          <Card className="border border-border/50 bg-card">
            <CardContent className="p-4 sm:p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                    {format(currentDate, 'MMMM yyyy')}
                  </h2>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')} className="h-8 w-8">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')} className="h-8 w-8">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date());
                }}>
                    Today
                  </Button>
                  {isExecMember && <Button size="sm" className="gap-2" onClick={() => setShowCreateEvent(true)}>
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">New Appointment</span>
                      <span className="sm:hidden">New</span>
                    </Button>}
                </div>
              </div>

              {/* Calendar Grid */}
              <MonthlyCalendar events={filteredEvents} onEventUpdated={fetchEvents} currentDate={currentDate} selectedDate={selectedDate} onDateSelect={setSelectedDate} onMonthChange={setCurrentDate} />
            </CardContent>
          </Card>
        </div>

        {/* Day Agenda Panel */}
        <div className="lg:w-80 xl:w-96">
          <DayAgendaPanel selectedDate={selectedDate} events={selectedDateEvents} onEventClick={event => {
          console.log('Event clicked:', event);
        }} />
        </div>
      </div>

      {/* Calendar Filter Strip */}
      <CalendarFilterStrip onCalendarsChange={setVisibleCalendarIds} />

      {/* Admin Controls */}
      {isAdmin && <Card className="border border-border/50">
          <CardContent className="px-3 py-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-primary-foreground">Admin Controls</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/calendar/settings')} className="gap-1.5 h-7 text-xs px-2">
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Manage Calendars
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <CalendarManager />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>}

      {/* Create Event Dialog - triggered by state */}
      {showCreateEvent && <CreateEventDialog onEventCreated={() => {
      setShowCreateEvent(false);
      fetchEvents();
    }} initialDate={selectedDate} />}
    </div>;
};