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
  return <div className="h-full flex flex-col bg-card rounded-lg border border-border/50">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border/50">
        <h2 className="text-xl font-bold text-foreground sm:text-xl">
          {format(selectedDate, 'MMMM d, yyyy')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </p>
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-6">
          {events.length === 0 ? <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No events for this day</p>
            </div> : <>
              {/* Public Events Section */}
              {publicEvents.length > 0 && <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span>GleeWorld Events</span>
                  </div>
                  {publicEvents.map(event => <EventCard key={event.id} event={event} onEventClick={onEventClick} formatEventTime={formatEventTime} />)}
                </div>}

              {/* Personal Events Section */}
              {myEvents.length > 0 && <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>My Calendar</span>
                    <Badge variant="secondary" className="text-xs">Private</Badge>
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
}: EventCardProps) => <div onClick={() => onEventClick?.(event)} className={`p-4 rounded-lg border cursor-pointer transition-colors ${isPersonal ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' : 'border-border/50 bg-background hover:bg-accent/50'}`}>
    <h3 className="font-semibold text-foreground mb-2">{event.title}</h3>
    
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <Clock className="h-4 w-4 flex-shrink-0" />
      <span>{formatEventTime(event.start_date, event.end_date ?? undefined)}</span>
    </div>

    {event.location && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{event.location}</span>
      </div>}

    {event.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
        {event.description}
      </p>}
  </div>;