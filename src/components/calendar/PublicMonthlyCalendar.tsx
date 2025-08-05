import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  addMonths, 
  subMonths 
} from "date-fns";
import { GleeWorldEvent } from "@/hooks/usePublicGleeWorldEvents";
import { EventDetailDialog } from "./EventDetailDialog";
import { EventHoverCard } from "./EventHoverCard";

interface PublicMonthlyCalendarProps {
  events: GleeWorldEvent[];
  onEventUpdated?: () => void;
}

export const PublicMonthlyCalendar = ({ events, onEventUpdated }: PublicMonthlyCalendarProps) => {
  // Default to the month of the first event if available, otherwise current date
  const getInitialDate = () => {
    if (events.length > 0) {
      const firstEvent = events.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
      return new Date(firstEvent.start_date);
    }
    return new Date();
  };

  const [currentDate, setCurrentDate] = useState(getInitialDate());
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Update current date when events change
  useEffect(() => {
    if (events.length > 0) {
      const firstEvent = events.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
      setCurrentDate(new Date(firstEvent.start_date));
    }
  }, [events]);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate the full calendar grid including previous and next month dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Sunday
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      
      // Compare year, month, and day only (ignore time)
      const eventDay = eventDate.getDate();
      const eventMonth = eventDate.getMonth();
      const eventYear = eventDate.getFullYear();
      
      const compareDay = date.getDate();
      const compareMonth = date.getMonth();
      const compareYear = date.getFullYear();
      
      return eventDay === compareDay && eventMonth === compareMonth && eventYear === compareYear;
    });
  };

  const handleEventClick = (event: GleeWorldEvent) => {
    setSelectedEvent(event);
  };

  const handleDateClick = (date: Date) => {
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length === 1) {
      setSelectedEvent(dayEvents[0]);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(current => 
      direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
    );
  };

  return (
    <div className="w-full">
      <Card>
        <CardContent className="p-2 md:p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 md:h-10 md:w-10 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-lg md:text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 md:h-10 md:w-10 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-xs md:text-sm font-medium text-muted-foreground">
                {isMobile ? day.charAt(0) : day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {days.map((day, dayIdx) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div
                  key={day.toString()}
                  className={`
                    min-h-[60px] md:min-h-[80px] p-1 md:p-2 border rounded-lg cursor-pointer transition-colors
                    ${isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                    ${isToday ? 'ring-2 ring-primary' : ''}
                    ${dayEvents.length > 0 ? 'hover:bg-primary/5' : 'hover:bg-muted/50'}
                  `}
                  onClick={() => handleDateClick(day)}
                >
                  <div className={`text-xs md:text-sm font-medium mb-1 ${
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, isMobile ? 2 : 3).map((event, index) => (
                      <EventHoverCard key={event.id} event={event}>
                        <div
                          className={`
                            text-xs p-1 rounded cursor-pointer truncate
                            bg-primary/10 text-primary border border-primary/20
                            hover:bg-primary/20 transition-colors
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          {event.title}
                        </div>
                      </EventHoverCard>
                    ))}
                    {dayEvents.length > (isMobile ? 2 : 3) && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayEvents.length - (isMobile ? 2 : 3)} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <EventDetailDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      )}
    </div>
  );
};