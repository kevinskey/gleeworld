import { format } from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { Clock, MapPin, CalendarDays, Lock, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
interface DayAgendaPanelProps {
  selectedDate: Date;
  events: GleeWorldEvent[];
  onEventClick?: (event: GleeWorldEvent) => void;
}
export const DayAgendaPanel = ({
  selectedDate,
  events,
  onEventClick
}: DayAgendaPanelProps) => {
  const {
    user
  } = useAuth();
  const formatEventTime = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const timeStr = format(start, 'h:mm a');
    if (endDate) {
      const end = new Date(endDate);
      return `${timeStr} - ${format(end, 'h:mm a')}`;
    }
    return timeStr;
  };

  // Separate public events from personal (synced) events
  const publicEvents = events.filter(e => e.is_public);
  const myEvents = events.filter(e => !e.is_public && e.created_by === user?.id);
  return <div className="h-full flex flex-col bg-card rounded-lg border border-border/50 min-w-0 overflow-hidden">
      {/* Header - more compact */}
      <div className="p-2 sm:p-3 border-b border-border/50 flex-shrink-0">
        <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
          {format(selectedDate, 'MMM d, yyyy')}
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </p>
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
          {events.length === 0 ? <div className="text-center py-3 sm:py-4">
              <CalendarDays className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50 mx-auto mb-1" />
              <p className="text-muted-foreground text-[10px] sm:text-xs">No events</p>
            </div> : <>
              {/* Public Events Section */}
              {publicEvents.length > 0 && <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-muted-foreground">
                    <Globe className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">GleeWorld</span>
                  </div>
                  {publicEvents.map(event => <EventCard key={event.id} event={event} onEventClick={onEventClick} formatEventTime={formatEventTime} />)}
                </div>}

              {/* Personal Events Section */}
              {myEvents.length > 0 && <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-muted-foreground">
                    <Lock className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">Personal</span>
                  </div>
                  {myEvents.map(event => <EventCard key={event.id} event={event} onEventClick={onEventClick} formatEventTime={formatEventTime} isPersonal />)}
                </div>}
            </>}
        </div>
      </ScrollArea>
    </div>;
};
interface EventCardProps {
  event: GleeWorldEvent;
  onEventClick?: (event: GleeWorldEvent) => void;
  formatEventTime: (start: string, end?: string) => string;
  isPersonal?: boolean;
}
const EventCard = ({
  event,
  onEventClick,
  formatEventTime,
  isPersonal
}: EventCardProps) => <div onClick={() => onEventClick?.(event)} className={`p-2 rounded-md border cursor-pointer transition-colors ${isPersonal ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' : 'border-border/50 bg-background hover:bg-accent/50'}`}>
    <h3 className="font-semibold text-foreground text-xs sm:text-sm truncate">{event.title}</h3>
    
    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
      <span className="truncate">{formatEventTime(event.start_date, event.end_date ?? undefined)}</span>
    </div>

    {event.location && <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
        <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
        <span className="truncate">{event.location}</span>
      </div>}
  </div>;