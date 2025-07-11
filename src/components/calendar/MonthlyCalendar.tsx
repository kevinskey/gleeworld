import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { EventDetailDialog } from "./EventDetailDialog";
import { EditEventDialog } from "./EditEventDialog";
import { useAuth } from "@/contexts/AuthContext";

interface MonthlyCalendarProps {
  events: GleeWorldEvent[];
  onEventUpdated?: () => void;
}

export const MonthlyCalendar = ({ events, onEventUpdated }: MonthlyCalendarProps) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<GleeWorldEvent | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_date), date)
    );
  };

  const handleEventClick = (event: GleeWorldEvent) => {
    const canEdit = user && (user.id === event.created_by || user.role === 'admin' || user.role === 'super-admin');
    
    if (canEdit) {
      setEditingEvent(event);
    } else {
      setSelectedEvent(event);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  return (
    <div className="space-y-2 md:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold">
          <span className="hidden sm:inline">{format(currentDate, 'MMMM yyyy')}</span>
          <span className="sm:hidden">{format(currentDate, 'MMM yy')}</span>
        </h3>
        <div className="flex gap-1 md:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
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
            <span className="hidden sm:inline">Today</span>
            <span className="sm:hidden">Now</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="h-7 w-7 md:h-8 md:w-8 p-0"
          >
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 md:gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <div key={day} className="p-1 md:p-2 text-center text-xs md:text-sm font-medium text-muted-foreground">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][index]}</span>
          </div>
        ))}
        
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={day.toString()}
              className={`
                min-h-[60px] md:min-h-[100px] p-1 md:p-2 border border-border
                ${isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                ${isToday ? 'bg-primary/10 border-primary' : ''}
              `}
            >
              <div className={`text-xs md:text-sm ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5 md:space-y-1 mt-1">
                {dayEvents.slice(0, window.innerWidth < 768 ? 1 : 2).map(event => {
                  const canEdit = user && (user.id === event.created_by || user.role === 'admin' || user.role === 'super-admin');
                  return (
                    <Button
                      key={event.id}
                      variant="ghost"
                      size="sm"
                      className={`w-full h-auto p-0.5 md:p-1 text-[10px] md:text-xs justify-start hover:bg-primary/20 ${canEdit ? 'hover:scale-105' : ''} transition-all`}
                      onClick={() => handleEventClick(event)}
                      title={`${event.title}${canEdit ? ' (Click to edit)' : ' (Click for details)'}`}
                    >
                      <Badge variant="secondary" className="text-[8px] md:text-xs px-0.5 md:px-1 mr-0.5 md:mr-1">
                        {format(new Date(event.start_date), 'HH:mm')}
                      </Badge>
                      <span className="truncate text-[10px] md:text-xs">{event.title}</span>
                    </Button>
                  );
                })}
                {dayEvents.length > (window.innerWidth < 768 ? 1 : 2) && (
                  <div className="text-[8px] md:text-xs text-muted-foreground text-center">
                    +{dayEvents.length - (window.innerWidth < 768 ? 1 : 2)}
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
      
      <EditEventDialog
        event={editingEvent}
        open={!!editingEvent}
        onOpenChange={(open) => !open && setEditingEvent(null)}
        onEventUpdated={() => {
          setEditingEvent(null);
          onEventUpdated?.();
        }}
      />
    </div>
  );
};