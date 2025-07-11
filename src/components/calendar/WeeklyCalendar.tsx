import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { EventDetailDialog } from "./EventDetailDialog";
import { EditEventDialog } from "./EditEventDialog";
import { useAuth } from "@/contexts/AuthContext";
import { EventHoverCard } from "./EventHoverCard";

interface WeeklyCalendarProps {
  events: GleeWorldEvent[];
  onEventUpdated?: () => void;
}

export const WeeklyCalendar = ({ events, onEventUpdated }: WeeklyCalendarProps) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<GleeWorldEvent | null>(null);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

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

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const getEventTypeColor = (type: string | null) => {
    switch (type) {
      case 'performance':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'rehearsal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'meeting':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'social':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      case 'workshop':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'audition':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold">
          <span className="hidden sm:inline">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <span className="sm:hidden">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'd')}
          </span>
        </h3>
        <div className="flex gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('prev')}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="h-7 px-2 sm:h-8 sm:px-3 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">This Week</span>
            <span className="sm:hidden">Now</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('next')}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* Week Grid - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 sm:gap-1">
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={day.toString()}
              className={`
                min-h-[100px] sm:min-h-[120px] p-2 sm:p-3 border border-border rounded-lg sm:rounded-none
                ${isToday ? 'bg-primary/10 border-primary shadow-sm' : 'bg-background'}
                transition-colors
              `}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between sm:flex-col sm:items-start mb-2 sm:mb-3">
                <div className="text-center sm:w-full">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                    <span className="hidden sm:inline">{format(day, 'EEEE')}</span>
                    <span className="sm:hidden">{format(day, 'EEE')}</span>
                  </div>
                  <div className={`text-lg sm:text-xl font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                
                {/* Event count for mobile */}
                {dayEvents.length > 0 && (
                  <Badge variant="secondary" className="text-xs sm:hidden">
                    {dayEvents.length}
                  </Badge>
                )}
              </div>

              {/* Events */}
              <div className="space-y-1 sm:space-y-2">
                {dayEvents.length > 0 ? (
                  <>
                    {dayEvents.slice(0, window.innerWidth < 640 ? 2 : 4).map(event => {
                      const canEdit = user && (user.id === event.created_by || user.role === 'admin' || user.role === 'super-admin');
                      return (
                        <EventHoverCard key={event.id} event={event} canEdit={canEdit}>
                          <div
                            className={`
                              p-2 rounded cursor-pointer transition-all duration-200
                              ${canEdit ? 'hover:scale-[1.02] active:scale-[0.98]' : 'hover:opacity-80'}
                              touch-manipulation shadow-sm hover:shadow-md
                              ${getEventTypeColor(event.event_type)}
                            `}
                            onClick={() => handleEventClick(event)}
                            title={`${event.title}${canEdit ? ' (Tap to edit)' : ' (Tap for details)'}`}
                          >
                            {/* Mobile layout - stacked */}
                            <div className="space-y-1 sm:hidden">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-medium truncate flex-1">
                                  {event.title}
                                </div>
                                {canEdit && (
                                  <Badge variant="outline" className="text-[10px] ml-1 bg-white/50">
                                    Edit
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] opacity-80">
                                {format(new Date(event.start_date), 'h:mm a')}
                                {event.end_date && (
                                  <> - {format(new Date(event.end_date), 'h:mm a')}</>
                                )}
                              </div>
                            </div>

                            {/* Desktop layout - side by side */}
                            <div className="hidden sm:block">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-[10px] px-1 shrink-0">
                                  {format(new Date(event.start_date), 'h:mm a')}
                                </Badge>
                                {canEdit && (
                                  <Badge variant="outline" className="text-[10px] bg-white/50">
                                    Edit
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs font-medium line-clamp-2">
                                {event.title}
                              </div>
                            </div>
                          </div>
                        </EventHoverCard>
                      );
                    })}
                    
                    {/* More events indicator */}
                    {dayEvents.length > (window.innerWidth < 640 ? 2 : 4) && (
                      <div 
                        className="text-xs text-muted-foreground text-center p-1 cursor-pointer hover:text-primary"
                        onClick={() => {
                          if (dayEvents.length > 0) handleEventClick(dayEvents[0]);
                        }}
                      >
                        +{dayEvents.length - (window.innerWidth < 640 ? 2 : 4)} more
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-2 sm:py-4">
                    No events
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