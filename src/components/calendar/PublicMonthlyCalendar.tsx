import { useState, useEffect } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth
} from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { EventDetailDialog } from "./EventDetailDialog";
import { EventHoverCard } from "./EventHoverCard";

interface PublicMonthlyCalendarProps {
  events: GleeWorldEvent[];
  onEventUpdated?: () => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

export const PublicMonthlyCalendar = ({ 
  events, 
  onEventUpdated,
  currentDate: externalDate,
  onDateChange 
}: PublicMonthlyCalendarProps) => {
  const [internalDate, setInternalDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Use external date if provided, otherwise use internal
  const currentDate = externalDate ?? internalDate;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
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

  return (
    <div className="w-full bg-white rounded-lg">
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 md:p-3 text-center text-xs md:text-sm font-semibold text-[#003666] bg-[#003666]/5 rounded-t-lg">
            {isMobile ? day.charAt(0) : day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {days.map((day) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          
          return (
            <div
              key={day.toString()}
              className={`
                min-h-[70px] md:min-h-[100px] p-1 md:p-2 border border-neutral-200 cursor-pointer transition-colors
                ${isCurrentMonth ? 'bg-white' : 'bg-neutral-50'}
                ${isToday ? 'ring-2 ring-[#003666] ring-inset' : ''}
                ${dayEvents.length > 0 ? 'hover:bg-blue-50' : 'hover:bg-neutral-100'}
              `}
              onClick={() => handleDateClick(day)}
            >
              <div className={`text-sm md:text-base font-medium mb-1 ${
                isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
              } ${isToday ? 'text-[#003666] font-bold' : ''}`}>
                {format(day, 'd')}
              </div>
              
              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, isMobile ? 2 : 3).map((event) => (
                  <EventHoverCard key={event.id} event={event}>
                    <div
                      className="text-xs p-1 rounded cursor-pointer truncate bg-[#003666] text-white hover:bg-[#002244] transition-colors"
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
                  <div className="text-xs text-[#003666] font-medium text-center">
                    +{dayEvents.length - (isMobile ? 2 : 3)} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
