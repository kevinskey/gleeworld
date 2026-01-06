import { format } from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { Clock, MapPin, CalendarDays } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DayAgendaPanelProps {
  selectedDate: Date;
  events: GleeWorldEvent[];
  onEventClick?: (event: GleeWorldEvent) => void;
}

export const DayAgendaPanel = ({ selectedDate, events, onEventClick }: DayAgendaPanelProps) => {
  const formatEventTime = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const timeStr = format(start, 'h:mm a');
    if (endDate) {
      const end = new Date(endDate);
      return `${timeStr} - ${format(end, 'h:mm a')}`;
    }
    return timeStr;
  };

  return (
    <div className="h-full flex flex-col bg-card rounded-lg border border-border/50">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border/50">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          {format(selectedDate, 'MMMM d, yyyy')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {events.length} {events.length === 1 ? 'appointment' : 'appointments'}
        </p>
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No appointments for this day</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="p-4 rounded-lg border border-border/50 bg-background hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-2">{event.title}</h3>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>{formatEventTime(event.start_date, event.end_date)}</span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}

                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {event.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
