import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { EventDetailDialog } from "./EventDetailDialog";

interface WeeklyCalendarProps {
  events: GleeWorldEvent[];
  onEventUpdated?: () => void;
}

export const WeeklyCalendar = ({ events, onEventUpdated }: WeeklyCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_date), date)
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
  };

  return (
    <div className="space-y-2 md:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold">
          <span className="hidden sm:inline">{format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</span>
          <span className="sm:hidden">{format(weekStart, 'M/d')} - {format(weekEnd, 'M/d')}</span>
        </h3>
        <div className="flex gap-1 md:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('prev')}
            className="h-7 w-7 md:h-8 md:w-8 p-0"
          >
            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="h-7 px-2 md:h-8 md:px-3 text-xs md:text-sm"
          >
            <span className="hidden sm:inline">This Week</span>
            <span className="sm:hidden">Week</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('next')}
            className="h-7 w-7 md:h-8 md:w-8 p-0"
          >
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 md:gap-4">
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={day.toString()}
              className={`
                min-h-[120px] md:min-h-[200px] p-2 md:p-4 border border-border rounded-lg
                ${isToday ? 'bg-primary/10 border-primary' : 'bg-background'}
              `}
            >
              <div className="text-center mb-2 md:mb-3">
                <div className="text-xs md:text-sm text-muted-foreground">
                  <span className="hidden sm:inline">{format(day, 'EEE')}</span>
                  <span className="sm:hidden">{format(day, 'E')}</span>
                </div>
                <div className={`text-sm md:text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>
              
              <div className="space-y-1 md:space-y-2">
                {dayEvents.slice(0, window.innerWidth < 768 ? 2 : 4).map(event => (
                  <Button
                    key={event.id}
                    variant="ghost"
                    size="sm"
                    className="w-full h-auto p-1 md:p-2 text-xs justify-start hover:bg-primary/20 flex-col items-start"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <Badge variant="secondary" className="text-[10px] md:text-xs mb-0.5 md:mb-1">
                      {format(new Date(event.start_date), 'HH:mm')}
                    </Badge>
                    <span className="text-left text-[10px] md:text-xs line-clamp-2">{event.title}</span>
                  </Button>
                ))}
                {dayEvents.length > (window.innerWidth < 768 ? 2 : 4) && (
                  <div className="text-[10px] md:text-xs text-muted-foreground text-center">
                    +{dayEvents.length - (window.innerWidth < 768 ? 2 : 4)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <EventDetailDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        onEventUpdated={onEventUpdated}
      />
    </div>
  );
};