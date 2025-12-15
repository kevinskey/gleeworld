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

export const CourseCalendarView: React.FC<CourseCalendarViewProps> = ({ courseId }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, [courseId, currentMonth]);

  const fetchEvents = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('gw_course_calendar')
        .select('*')
        .eq('course_id', courseId)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
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
        <Card>
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
                <span className="font-semibold min-w-[150px] text-center">
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
                return (
                  <div
                    key={day.toISOString()}
                    className={`h-24 p-1 rounded-lg border transition-colors ${
                      isToday(day) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(day) ? 'text-primary' : 'text-foreground'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className="text-xs truncate px-1 py-0.5 rounded bg-primary/10 text-primary"
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground px-1">
                          +{dayEvents.length - 2} more
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
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
                      <span className="font-semibold text-sm">{event.title}</span>
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
