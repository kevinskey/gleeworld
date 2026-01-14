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
  class: { bg: 'bg-blue-200 dark:bg-blue-800', text: 'text-blue-900 dark:text-blue-100', border: 'border-blue-400 dark:border-blue-600' },
  rehearsal: { bg: 'bg-purple-200 dark:bg-purple-800', text: 'text-purple-900 dark:text-purple-100', border: 'border-purple-400 dark:border-purple-600' },
  assignment_due: { bg: 'bg-orange-200 dark:bg-orange-800', text: 'text-orange-900 dark:text-orange-100', border: 'border-orange-400 dark:border-orange-600' },
  test: { bg: 'bg-red-200 dark:bg-red-800', text: 'text-red-900 dark:text-red-100', border: 'border-red-400 dark:border-red-600' },
  office_hours: { bg: 'bg-green-200 dark:bg-green-800', text: 'text-green-900 dark:text-green-100', border: 'border-green-400 dark:border-green-600' },
  special: { bg: 'bg-indigo-200 dark:bg-indigo-800', text: 'text-indigo-900 dark:text-indigo-100', border: 'border-indigo-400 dark:border-indigo-600' },
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

  // Only show these event types in class calendar
  const ALLOWED_EVENT_TYPES = ['class', 'assignment_due', 'test', 'exam', 'midterm', 'final', 'quiz'];

  const fetchEvents = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      // Fetch course calendar events - filter to only class meetings, assignments, and tests
      const { data: courseData, error: courseError } = await supabase
        .from('gw_course_calendar')
        .select('*')
        .eq('course_id', courseId)
        .in('event_type', ALLOWED_EVENT_TYPES)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      if (courseError) throw courseError;

      // Fetch Spelman academic dates (semester events)
      const { data: semesterData, error: semesterError } = await supabase
        .from('gw_semesters')
        .select('academic_events')
        .eq('is_active', true)
        .single();

      if (!semesterError && semesterData?.academic_events) {
        const events = semesterData.academic_events as unknown as AcademicEvent[];
        setAcademicEvents(Array.isArray(events) ? events : []);
      }

      // For MUS 070 (Glee Club) ONLY, also include class/rehearsal events from gw_events
      const MUS_070_COURSE_ID = 'a0000000-0000-0000-0000-000000000070';
      let gleeEvents: CalendarEvent[] = [];
      
      // Only fetch Glee Club events if this is specifically MUS 070
      if (courseId === MUS_070_COURSE_ID) {
        const scgcCalendarId = 'b1e077a0-85f3-4665-b006-4767b310a521';
        
        const { data: eventsData, error: eventsError } = await supabase
          .from('gw_events')
          .select('id, title, description, event_type, start_date, location')
          .or(`calendar_id.eq.${scgcCalendarId},title.ilike.%glee%,title.ilike.%scgc%`)
          .in('event_type', ['class', 'rehearsal', 'meeting'])
          .gte('start_date', start.toISOString())
          .lte('start_date', end.toISOString())
          .order('start_date', { ascending: true });

        if (eventsError) throw eventsError;
        
        gleeEvents = (eventsData || []).map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          event_type: event.event_type || 'class',
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
        <Card className="overflow-hidden border-2">
          <CardContent className="p-2 sm:p-4 lg:p-6 bg-card">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b-2 border-border mb-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <div 
                  key={day} 
                  className={cn(
                    "text-center text-xs sm:text-sm lg:text-base font-bold text-foreground py-3 lg:py-4 uppercase tracking-wide bg-muted/50",
                    i < 6 && "border-r border-border"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days - Larger cells on desktop with visible borders */}
            <div className="grid grid-cols-7">
              {Array.from({ length: days[0].getDay() }).map((_, i) => (
                <div 
                  key={`empty-${i}`} 
                  className={cn(
                    "min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] xl:min-h-[160px] bg-muted/30 border-b border-border",
                    i < 6 && "border-r border-border"
                  )} 
                />
              ))}
              
              {days.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const dayAcademicEvents = getAcademicEventsForDay(day);
                const hasAcademicEvent = dayAcademicEvents.length > 0;
                const isCurrent = isToday(day);
                const totalEvents = dayEvents.length + dayAcademicEvents.length;
                const maxEventsToShow = 3;
                const dayOfWeek = (days[0].getDay() + index) % 7;
                const isLastColumn = dayOfWeek === 6;
                
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] xl:min-h-[160px] p-1.5 sm:p-2 lg:p-3 transition-all cursor-pointer hover:bg-accent/50 border-b border-border",
                      !isLastColumn && "border-r border-border",
                      isCurrent && "bg-primary/10 ring-2 ring-inset ring-primary",
                      hasAcademicEvent && !isCurrent && "bg-amber-50/80 dark:bg-amber-950/30"
                    )}
                  >
                    <div className={cn(
                      "text-base sm:text-lg lg:text-xl font-bold mb-1 lg:mb-2 text-foreground",
                      isCurrent && "text-primary"
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1 lg:space-y-1.5">
                      {dayAcademicEvents.slice(0, 1).map((event, idx) => (
                        <div
                          key={`academic-${idx}`}
                          className="text-[10px] sm:text-xs lg:text-sm font-semibold truncate px-1.5 sm:px-2 lg:px-2.5 py-1 sm:py-1.5 lg:py-2 rounded-md lg:rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 cursor-pointer hover:opacity-80 shadow-sm"
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
                              "text-[10px] sm:text-xs lg:text-sm font-semibold truncate px-1.5 sm:px-2 lg:px-2.5 py-1 sm:py-1.5 lg:py-2 rounded-md lg:rounded-lg cursor-pointer hover:opacity-80 shadow-sm",
                              colors.bg, colors.text
                            )}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                      {totalEvents > maxEventsToShow && (
                        <div className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground font-semibold px-1.5 sm:px-2">
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
