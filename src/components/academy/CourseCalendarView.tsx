import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

export const CourseCalendarView: React.FC<CourseCalendarViewProps> = ({ courseId }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, [courseId, currentMonth]);

  const fetchEvents = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      // Fetch from gw_course_calendar
      const { data: courseData, error: courseError } = await supabase
        .from('gw_course_calendar')
        .select('*')
        .eq('course_id', courseId)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      if (courseError) throw courseError;

      // Fetch Spelman academic events from active semester
      const { data: semesterData, error: semesterError } = await supabase
        .from('gw_semesters')
        .select('academic_events')
        .eq('is_active', true)
        .single();

      if (!semesterError && semesterData?.academic_events) {
        const events = semesterData.academic_events as unknown as AcademicEvent[];
        setAcademicEvents(Array.isArray(events) ? events : []);
      }

      // For MUS 070 (Glee Club), also fetch from gw_events with SCGC calendar or Glee-related titles
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
        
        // Transform gw_events to match CalendarEvent interface
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

      // Combine and dedupe events
      const allEvents = [...(courseData || []), ...gleeEvents];
      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if a day has academic events (Spelman dates)
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

  const getEventTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      class: 'bg-blue-100 text-blue-700',
      assignment_due: 'bg-orange-100 text-orange-700',
      test: 'bg-red-100 text-red-700',
      office_hours: 'bg-green-100 text-green-700',
      special: 'bg-purple-100 text-purple-700'
    };

    return (
      <Badge variant="outline" className={colors[type] || 'bg-gray-100 text-gray-700'}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  // Get upcoming events for sidebar
  const upcomingEvents = events
    .filter(e => new Date(e.start_time) >= new Date())
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <div className="lg:col-span-2">
        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Course Calendar
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold min-w-[150px] text-center text-foreground">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: days[0].getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 bg-muted/20 rounded-lg" />
              ))}
              
              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const dayAcademicEvents = getAcademicEventsForDay(day);
                const hasAcademicEvent = dayAcademicEvents.length > 0;
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`h-24 p-1 rounded-lg border transition-colors ${
                      isToday(day) 
                        ? 'border-primary bg-primary/5' 
                        : hasAcademicEvent
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(day) ? 'text-primary' : 'text-foreground'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {/* Spelman academic events */}
                      {dayAcademicEvents.slice(0, 1).map((event, idx) => (
                        <div
                          key={`academic-${idx}`}
                          className="text-xs truncate px-1 py-0.5 rounded bg-accent text-accent-foreground"
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {/* Regular events */}
                      {dayEvents.slice(0, dayAcademicEvents.length > 0 ? 1 : 2).map(event => (
                        <div
                          key={event.id}
                          className="text-xs truncate px-1 py-0.5 rounded bg-primary text-primary-foreground"
                        >
                          {event.title}
                        </div>
                      ))}
                      {(dayEvents.length + dayAcademicEvents.length) > 2 && (
                        <div className="text-xs text-muted-foreground px-1">
                          +{(dayEvents.length + dayAcademicEvents.length) - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <div>
        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming events this month.</p>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="border-l-2 border-primary pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-foreground">{event.title}</span>
                      {getEventTypeBadge(event.event_type)}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_time), 'MMM d, h:mm a')}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
