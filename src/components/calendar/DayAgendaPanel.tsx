import { format } from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { Clock, MapPin, CalendarDays, Lock, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const { user } = useAuth();

  const formatEventTime = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const timeStr = format(start, 'h:mm a');
    if (endDate) {
      const end = new Date(endDate);
      return `${timeStr} - ${format(end, 'h:mm a')}`;
    }
    return timeStr;
  };

  const publicEvents = events.filter(e => e.is_public);
  const myEvents = events.filter(e => !e.is_public && e.created_by === user?.id);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 text-white px-4 py-4 flex-shrink-0">
        <h2 className="text-lg font-bold">
          {format(selectedDate, 'EEEE')}
        </h2>
        <p className="text-slate-300 text-sm">
          {format(selectedDate, 'MMMM d, yyyy')}
        </p>
        <div className="mt-2 text-sm text-slate-400">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </div>
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No events scheduled</p>
              <p className="text-slate-400 text-sm mt-1">Select a date to view events</p>
            </div>
          ) : (
            <>
              {/* Public Events */}
              {publicEvents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Globe className="h-4 w-4" />
                    <span>GleeWorld Events</span>
                  </div>
                  {publicEvents.map(event => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      onEventClick={onEventClick} 
                      formatEventTime={formatEventTime} 
                    />
                  ))}
                </div>
              )}

              {/* Personal Events */}
              {myEvents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Lock className="h-4 w-4" />
                    <span>Personal</span>
                  </div>
                  {myEvents.map(event => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      onEventClick={onEventClick} 
                      formatEventTime={formatEventTime} 
                      isPersonal 
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
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
}: EventCardProps) => {
  const calendarColor = event.gw_calendars?.color || '#3b82f6';

  return (
    <div 
      onClick={() => onEventClick?.(event)} 
      className="p-3 rounded-lg border-l-4 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
      style={{ borderLeftColor: calendarColor }}
    >
      <h3 className="font-semibold text-slate-900 text-sm">{event.title}</h3>
      
      <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span>{formatEventTime(event.start_date, event.end_date ?? undefined)}</span>
      </div>

      {event.location && (
        <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
      )}
    </div>
  );
};