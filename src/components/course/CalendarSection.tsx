import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, BookOpen, FileCheck, Users, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { useGleeWorldEvents } from '@/hooks/useGleeWorldEvents';
interface CalendarSectionProps {
  courseId: string;
}
const SPELMAN_CALENDAR_NAME = 'Spelman';
export const CalendarSection: React.FC<CalendarSectionProps> = ({
  courseId
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const {
    events,
    loading: eventsLoading
  } = useGleeWorldEvents();

  // Filter events to show only Spelman calendar events by default
  const spelmanEvents = useMemo(() => {
    return events.filter(event => event.gw_calendars?.name === SPELMAN_CALENDAR_NAME);
  }, [events]);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });
  const getEventsForDate = (date: Date) => {
    return spelmanEvents.filter(event => {
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, date);
    });
  };
  const getEventColor = (eventType?: string) => {
    switch (eventType?.toLowerCase()) {
      case 'class':
      case 'lecture':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'assignment':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'test':
      case 'quiz':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'exam':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'office-hours':
      case 'meeting':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'deadline':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'performance':
      case 'concert':
        return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };
  const getEventIcon = (eventType?: string) => {
    switch (eventType?.toLowerCase()) {
      case 'class':
      case 'lecture':
        return <BookOpen className="h-3 w-3" />;
      case 'assignment':
      case 'test':
      case 'exam':
      case 'quiz':
        return <FileCheck className="h-3 w-3" />;
      case 'office-hours':
      case 'meeting':
        return <Users className="h-3 w-3" />;
      case 'deadline':
        return <Clock className="h-3 w-3" />;
      default:
        return <CalendarIcon className="h-3 w-3" />;
    }
  };
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return spelmanEvents.filter(event => parseISO(event.start_date) >= now).sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime()).slice(0, 5);
  }, [spelmanEvents]);
  if (eventsLoading) {
    return <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading calendar...</span>
      </div>;
  }
  return <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Academic Calendar</h2>
        <Badge variant="secondary" className="bg-[#8b5cf6]/10 text-[#8b5cf6]">
          <CalendarIcon className="h-3 w-3 mr-1" />
          Spelman College Calendar
        </Badge>
      </div>

      <Card className="bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle className="text-lg text-primary-foreground">Course Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-white/10 text-white border-white/20">
              <BookOpen className="h-3 w-3 mr-1" />
              Classes
            </Badge>
            <Badge variant="outline" className="bg-white/10 text-white border-white/20">
              <CalendarIcon className="h-3 w-3 mr-1" />
              Performances
            </Badge>
            <Badge variant="outline" className="bg-white/10 text-white border-white/20">
              <Users className="h-3 w-3 mr-1" />
              Meetings
            </Badge>
            <Badge variant="outline" className="bg-white/10 text-white border-white/20">
              <Clock className="h-3 w-3 mr-1" />
              Deadlines
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{format(currentDate, 'MMMM yyyy')}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center text-xs font-medium py-2 text-primary-foreground">
                  {day}
                </div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              return <button key={idx} onClick={() => setSelectedDate(day)} className={`
                      aspect-square p-1 text-sm rounded-lg border transition-colors
                      ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                      ${isToday ? 'border-primary bg-primary/5 font-bold' : 'border-border'}
                      ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                      ${dayEvents.length > 0 ? 'font-semibold' : ''}
                    `}>
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-primary-foreground">{format(day, 'd')}</span>
                      {dayEvents.length > 0 && <div className="flex gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((event, i) => <div key={i} className="w-1 h-1 rounded-full" style={{
                      backgroundColor: event.gw_calendars?.color || '#8b5cf6'
                    }} />)}
                        </div>}
                    </div>
                  </button>;
            })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length > 0 ? <div className="space-y-3">
                {selectedDateEvents.map(event => <div key={event.id} className={`border rounded-lg p-3 ${getEventColor(event.event_type)}`}>
                    <div className="flex items-start gap-2">
                      {getEventIcon(event.event_type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-primary-foreground">{event.title}</h4>
                        <p className="text-xs opacity-80 mt-0.5 text-primary-foreground pt-[5px]">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {format(parseISO(event.start_date), 'h:mm a')}
                        </p>
                        {event.location && <p className="text-xs opacity-80 mt-1 pt-[5px] text-primary-foreground">{event.location}</p>}
                        {event.description && <p className="text-xs opacity-80 mt-1 line-clamp-2 text-primary-foreground">{event.description}</p>}
                      </div>
                    </div>
                  </div>)}
              </div> : selectedDate ? <p className="text-sm text-muted-foreground text-center py-8">
                No events scheduled for this date
              </p> : <p className="text-sm text-center py-8 text-primary-foreground">
                Select a date to view events
              </p>}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Spelman Events</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length > 0 ? <div className="space-y-2">
              {upcomingEvents.map(event => <div key={event.id} className={`flex items-center justify-between p-3 border rounded-lg ${getEventColor(event.event_type)}`}>
                  <div className="flex items-center gap-3">
                    {getEventIcon(event.event_type)}
                    <div>
                      <h4 className="font-semibold text-sm text-primary-foreground">{event.title}</h4>
                      <p className="text-xs opacity-80 text-primary-foreground pt-[5px]">
                        {format(parseISO(event.start_date), 'MMM d, yyyy')}
                        {' • '}
                        {format(parseISO(event.start_date), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                  {event.event_type && <Badge variant="outline" className="capitalize text-primary-foreground">
                      {event.event_type.replace('-', ' ')}
                    </Badge>}
                </div>)}
            </div> : <p className="text-sm text-muted-foreground text-center py-8">
              No upcoming events from the Spelman calendar
            </p>}
        </CardContent>
      </Card>
    </div>;
};