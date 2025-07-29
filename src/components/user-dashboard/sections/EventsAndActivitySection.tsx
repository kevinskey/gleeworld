import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isAfter, isBefore, startOfDay } from "date-fns";
import { Calendar, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";

interface EventsAndActivitySectionProps {
  upcomingEvents: any[];
  recentActivity: Array<{
    id: string;
    action: string;
    time: string;
    type: string;
  }>;
}

export const EventsAndActivitySection = ({ 
  upcomingEvents
}: EventsAndActivitySectionProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { events } = useGleeWorldEvents();

  // Get all events for any date (not limited)
  const getAllEvents = () => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return !isNaN(eventDate.getTime());
    });
  };

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    const allEvents = getAllEvents();
    return allEvents.filter(event => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, date);
    });
  };

  // Get calendar days for current month
  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  // Check if date has events
  const hasEvents = (date: Date) => {
    const allEvents = getAllEvents();
    return allEvents.some(event => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, date);
    });
  };

  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date TBD';
      }
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Date TBD';
    }
  };

  const formatEventTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      return format(date, 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  const eventsForSelectedDate = getEventsForDate(selectedDate);
  const calendarDays = getCalendarDays();

  // Get upcoming events for mobile view (limited scroll list)
  const upcomingEventsList = getAllEvents()
    .filter(event => {
      const eventDate = new Date(event.start_date);
      return isAfter(eventDate, startOfDay(new Date())) || isSameDay(eventDate, new Date());
    })
    .sort((a, b) => {
      const dateA = new Date(a.start_date);
      const dateB = new Date(b.start_date);
      return dateA.getTime() - dateB.getTime();
    });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Events Calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Desktop Calendar View - Hidden on Mobile */}
        <div className="hidden md:block space-y-4">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Mini Calendar */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="p-1 font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {calendarDays.map(day => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isSameDay(day, selectedDate);
              const hasEventsOnDay = hasEvents(day);
              
              return (
                <Button
                  key={day.toISOString()}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  className={`
                    h-8 w-8 p-0 text-xs relative
                    ${!isCurrentMonth ? 'text-muted-foreground opacity-50' : ''}
                    ${hasEventsOnDay ? 'font-bold' : ''}
                  `}
                  onClick={() => setSelectedDate(day)}
                >
                  {format(day, 'd')}
                  {hasEventsOnDay && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </Button>
              );
            })}
          </div>

          {/* Events for Selected Date */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">
              Events for {format(selectedDate, 'MMMM d, yyyy')}
            </h4>
            <ScrollArea className="h-[120px]">
              {eventsForSelectedDate.length > 0 ? (
                <div className="space-y-2">
                  {eventsForSelectedDate.map((event) => (
                    <div 
                      key={event.id} 
                      className="group flex items-center justify-between p-2 border-l-4 border-primary/30 bg-card hover:bg-accent/50 hover:border-primary transition-all duration-200 rounded-r-md"
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-foreground group-hover:text-primary transition-colors truncate text-sm">
                          {event.title}
                        </h5>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {formatEventTime(event.start_date) && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatEventTime(event.start_date)}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-center text-sm">No events on this date</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Mobile Scroll List View - Shown only on Mobile */}
        <div className="md:hidden">
          <ScrollArea className="h-[280px]">
            {upcomingEventsList.length > 0 ? (
              <div className="space-y-3">
                {upcomingEventsList.map((event) => (
                  <div 
                    key={event.id} 
                    className="group flex items-center justify-between p-3 border-l-4 border-primary/30 bg-card hover:bg-accent/50 hover:border-primary transition-all duration-200 rounded-r-md"
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-foreground group-hover:text-primary transition-colors truncate text-base">
                        {event.title}
                      </h5>
                      <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatEventDate(event.start_date)}</span>
                        </div>
                        {formatEventTime(event.start_date) && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatEventTime(event.start_date)}</span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <div className="w-2 h-2 rounded-full bg-primary/60 group-hover:bg-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-16 w-16 mb-3 opacity-40" />
                <p className="text-center text-base">No upcoming events scheduled</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};