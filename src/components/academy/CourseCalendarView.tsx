import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, List, Grid3X3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CourseCalendarViewProps {
  courseId: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
}

interface AcademicEvent {
  title: string;
  type: string;
  date?: string;
  start_date?: string;
  end_date?: string;
}

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  class: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  rehearsal: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  assignment_due: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  test: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700' },
  office_hours: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  special: { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
};

export const CourseCalendarView: React.FC<CourseCalendarViewProps> = ({ courseId }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedAcademicEvent, setSelectedAcademicEvent] = useState<AcademicEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

  useEffect(() => {
    fetchEvents();
  }, [courseId, currentMonth]);

  const fetchEvents = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const { data: courseData, error: courseError } = await supabase
        .from('gw_course_calendar')
        .select('*')
        .eq('course_id', courseId)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      if (courseError) throw courseError;

      const { data: semesterData, error: semesterError } = await supabase
        .from('gw_semesters')
        .select('academic_events')
        .eq('is_active', true)
        .single();

      if (!semesterError && semesterData?.academic_events) {
        const events = semesterData.academic_events as unknown as AcademicEvent[];
        setAcademicEvents(Array.isArray(events) ? events : []);
      }

      let gleeEvents: CalendarEvent[] = [];
      if (courseId === 'a0000000-0000-0000-0000-000000000070') {
        const scgcCalendarId = 'b1e077a0-85f3-4665-b006-4767b310a521';
        
        const { data: eventsData, error: eventsError } = await supabase
          .from('gw_events')
          .select('id, title, description, event_type, start_date, location')
          .or(`calendar_id.eq.${scgcCalendarId},title.ilike.%glee%,title.ilike.%scgc%`)
          .gte('start_date', start.toISOString())
          .lte('start_date', end.toISOString())
          .order('start_date', { ascending: true });

        if (eventsError) throw eventsError;
        
        gleeEvents = (eventsData || []).map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          event_type: event.event_type || 'rehearsal',
          start_time: event.start_date,
          end_time: null,
          location: event.location
        }));
      }

      const allEvents = [...(courseData || []), ...gleeEvents];
      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAcademicEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return academicEvents.filter(event => {
      if (event.date === dayStr) return true;
      if (event.start_date && event.end_date) {
        return dayStr >= event.start_date && dayStr <= event.end_date;
      }
      if (event.start_date === dayStr) return true;
      return false;
    });
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_time), day));
  };

  const getEventColors = (type: string) => {
    return EVENT_COLORS[type] || EVENT_COLORS.class;
  };

  const upcomingEvents = events
    .filter(e => new Date(e.start_time) >= startOfDay(new Date()))
    .slice(0, 8);

  // List View Component
  const ListView = () => (
    <div className="space-y-4">
      {upcomingEvents.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No upcoming events this month</p>
        </div>
      ) : (
        upcomingEvents.map(event => {
          const colors = getEventColors(event.event_type);
          return (
            <Card 
              key={event.id}
              className={cn(
                "cursor-pointer hover:shadow-md transition-all border-l-4",
                colors.border
              )}
              onClick={() => setSelectedEvent(event)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Badge variant="secondary" className={cn("mb-2", colors.bg, colors.text)}>
                      {event.event_type.replace('_', ' ')}
                    </Badge>
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {format(new Date(event.start_time), 'EEE, MMM d • h:mm a')}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-bold min-w-[180px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'calendar' | 'list')}>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4 mr-2" />
                List
              </ToggleGroupItem>
              <ToggleGroupItem value="calendar" aria-label="Calendar view">
                <Grid3X3 className="h-4 w-4 mr-2" />
                Calendar
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : viewMode === 'list' ? (
        <ListView />
      ) : (
        /* Calendar Grid View - Expanded for desktop */
        <Card className="overflow-hidden">
          <CardContent className="p-2 sm:p-4 lg:p-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-3 mb-2 lg:mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs sm:text-sm lg:text-base font-semibold text-muted-foreground py-2 lg:py-3 uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days - Larger cells on desktop */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-3">
              {Array.from({ length: days[0].getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] xl:min-h-[160px] bg-muted/20 rounded-lg lg:rounded-xl" />
              ))}
              
              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const dayAcademicEvents = getAcademicEventsForDay(day);
                const hasAcademicEvent = dayAcademicEvents.length > 0;
                const isCurrent = isToday(day);
                const totalEvents = dayEvents.length + dayAcademicEvents.length;
                const maxEventsToShow = 3;
                
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] xl:min-h-[160px] p-1.5 sm:p-2 lg:p-3 rounded-lg lg:rounded-xl border-2 transition-all cursor-pointer hover:shadow-md",
                      isCurrent && "border-primary bg-primary/5",
                      hasAcademicEvent && !isCurrent && "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20",
                      !isCurrent && !hasAcademicEvent && "border-transparent hover:border-primary/30"
                    )}
                  >
                    <div className={cn(
                      "text-base sm:text-lg lg:text-xl font-bold mb-1 lg:mb-2",
                      isCurrent && "text-primary"
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1 lg:space-y-1.5">
                      {dayAcademicEvents.slice(0, 1).map((event, idx) => (
                        <div
                          key={`academic-${idx}`}
                          className="text-[10px] sm:text-xs lg:text-sm font-medium truncate px-1.5 sm:px-2 lg:px-2.5 py-1 sm:py-1.5 lg:py-2 rounded-md lg:rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 cursor-pointer hover:opacity-80"
                          onClick={(e) => { e.stopPropagation(); setSelectedAcademicEvent(event); }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.slice(0, maxEventsToShow - dayAcademicEvents.length).map(event => {
                        const colors = getEventColors(event.event_type);
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "text-[10px] sm:text-xs lg:text-sm font-medium truncate px-1.5 sm:px-2 lg:px-2.5 py-1 sm:py-1.5 lg:py-2 rounded-md lg:rounded-lg cursor-pointer hover:opacity-80",
                              colors.bg, colors.text
                            )}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                      {totalEvents > maxEventsToShow && (
                        <div className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground font-medium px-1.5 sm:px-2">
                          +{totalEvents - maxEventsToShow} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Calendar className="h-5 w-5 text-primary" />
                  {selectedEvent.title}
                </DialogTitle>
                <DialogDescription>
                  <Badge variant="secondary" className={cn(getEventColors(selectedEvent.event_type).bg, getEventColors(selectedEvent.event_type).text)}>
                    {selectedEvent.event_type.replace('_', ' ')}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">{format(new Date(selectedEvent.start_time), 'EEEE, MMMM d, yyyy')}</div>
                    <div className="text-muted-foreground">
                      {format(new Date(selectedEvent.start_time), 'h:mm a')}
                      {selectedEvent.end_time && ` - ${format(new Date(selectedEvent.end_time), 'h:mm a')}`}
                    </div>
                  </div>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Academic Event Detail Dialog */}
      <Dialog open={!!selectedAcademicEvent} onOpenChange={(open) => !open && setSelectedAcademicEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedAcademicEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  {selectedAcademicEvent.title}
                </DialogTitle>
                <DialogDescription>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                    {selectedAcademicEvent.type || 'Academic Event'}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div className="font-semibold">
                    {selectedAcademicEvent.date && format(new Date(selectedAcademicEvent.date), 'EEEE, MMMM d, yyyy')}
                    {selectedAcademicEvent.start_date && selectedAcademicEvent.end_date && (
                      `${format(new Date(selectedAcademicEvent.start_date), 'MMM d')} - ${format(new Date(selectedAcademicEvent.end_date), 'MMM d, yyyy')}`
                    )}
                    {selectedAcademicEvent.start_date && !selectedAcademicEvent.end_date && !selectedAcademicEvent.date && (
                      format(new Date(selectedAcademicEvent.start_date), 'EEEE, MMMM d, yyyy')
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
