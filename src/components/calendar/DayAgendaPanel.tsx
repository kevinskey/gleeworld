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
  return <div className="h-full flex flex-col bg-card rounded-lg border border-border/50 min-w-0">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border/50">
        <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
          {format(selectedDate, 'MMMM d, yyyy')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </p>
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4 space-y-4">
          {events.length === 0 ? <div className="text-center py-6">
              <CalendarDays className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground text-xs sm:text-sm">No events for this day</p>
            </div> : <>
              {/* Public Events Section */}
              {publicEvents.length > 0 && <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">GleeWorld Events</span>
                  </div>
                  {publicEvents.map(event => <EventCard key={event.id} event={event} onEventClick={onEventClick} formatEventTime={formatEventTime} />)}
                </div>}

              {/* Personal Events Section */}
              {myEvents.length > 0 && <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">My Calendar</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Private</Badge>
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
}: EventCardProps) => <div onClick={() => onEventClick?.(event)} className={`p-3 rounded-lg border cursor-pointer transition-colors ${isPersonal ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' : 'border-border/50 bg-background hover:bg-accent/50'}`}>
    <h3 className="font-semibold text-foreground mb-1.5 text-sm sm:text-base truncate">{event.title}</h3>
    
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="text-xs sm:text-sm truncate">{formatEventTime(event.start_date, event.end_date ?? undefined)}</span>
    </div>

    {event.location && <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate text-xs sm:text-sm">{event.location}</span>
      </div>}

    {event.description && <p className="text-muted-foreground line-clamp-2 mt-1.5 text-xs sm:text-sm">
        {event.description}
      </p>}
  </div>;