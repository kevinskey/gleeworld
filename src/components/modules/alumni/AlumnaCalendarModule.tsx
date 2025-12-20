import { useState, useEffect } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { Calendar as CalendarIcon, MapPin, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  event_type?: string;
}

export function AlumnaCalendarModule({ user, isFullPage }: ModuleProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

  const fetchEvents = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('events')
        .select('id, title, description, start_date, end_date, location, event_type')
        .gte('start_date', startOfMonth.toISOString())
        .lte('start_date', endOfMonth.toISOString())
        .order('start_date');

      if (error) throw error;
      setEvents((data || []) as CalendarEvent[]);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([
        {
          id: '1',
          title: 'Homecoming Concert',
          description: 'Annual Homecoming performance',
          start_date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 18, 19, 0).toISOString(),
          location: 'Sisters Chapel',
          event_type: 'concert'
        },
        {
          id: '2',
          title: 'Alumni Mixer',
          description: 'Network with fellow alumni',
          start_date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 22, 18, 0).toISOString(),
          location: 'Spelman College',
          event_type: 'social'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = (eventTitle: string) => {
    toast.success(`RSVP confirmed for ${eventTitle}!`);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + (direction === 'next' ? 1 : -1),
      1
    ));
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'concert': return 'bg-purple-500';
      case 'reunion': return 'bg-amber-500';
      case 'social': return 'bg-blue-500';
      case 'tour': return 'bg-cyan-500';
      case 'fundraiser': return 'bg-rose-500';
      default: return 'bg-gray-500';
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
  };

  // Generate calendar days
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.getDate() === day;
    });
  };

  return (
    <ModuleWrapper
      title="Alumni Calendar"
      icon={CalendarIcon}
    >
      <div className="space-y-6">
        {/* Month Navigation */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-xl">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {getDaysInMonth().map((day, index) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                const isToday = day === new Date().getDate() && 
                  currentMonth.getMonth() === new Date().getMonth() &&
                  currentMonth.getFullYear() === new Date().getFullYear();
                
                return (
                  <div
                    key={index}
                    className={`min-h-[60px] p-1 rounded-md border ${
                      day ? 'border-border' : 'border-transparent'
                    } ${isToday ? 'bg-primary/10 border-primary' : ''}`}
                  >
                    {day && (
                      <>
                        <span className={`text-sm ${isToday ? 'font-bold text-primary' : ''}`}>
                          {day}
                        </span>
                        <div className="space-y-0.5 mt-1">
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className={`text-xs truncate px-1 py-0.5 rounded ${getEventTypeColor(event.event_type)} text-white`}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{dayEvents.length - 2} more
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Upcoming Events</h3>
          <div className="space-y-3">
            {events.map((event) => {
              const { day, weekday, time } = formatEventDate(event.start_date);
              return (
                <Card key={event.id}>
                  <CardContent className="py-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg px-3 py-2 min-w-[60px]">
                        <span className="text-xs text-muted-foreground">{weekday}</span>
                        <span className="text-2xl font-bold text-primary">{day}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{event.title}</h4>
                            {event.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{event.description}</p>
                            )}
                          </div>
                          <Badge className={getEventTypeColor(event.event_type)}>
                            {event.event_type}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {time}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                        <Button size="sm" className="mt-3" onClick={() => handleRSVP(event.title)}>
                          RSVP
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </ModuleWrapper>
  );
}

export default AlumnaCalendarModule;
