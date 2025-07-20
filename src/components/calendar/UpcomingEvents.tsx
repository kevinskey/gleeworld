import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, MapPinIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { parseISO } from "date-fns";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useState } from "react";
import { EventDetailDialog } from "./EventDetailDialog";
import { EventHoverCard } from "./EventHoverCard";
import { getEventTypeColor } from "@/utils/colorUtils";

interface UpcomingEventsProps {
  limit?: number;
  showHeader?: boolean;
}

export const UpcomingEvents = ({ limit = 6, showHeader = true }: UpcomingEventsProps) => {
  const { getUpcomingEvents, loading } = useGleeWorldEvents();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const upcomingEvents = getUpcomingEvents(limit);

  // Using centralized color utilities now

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading events...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1 text-sm">
            <CalendarIcon className="h-3 w-3" />
            <span>Events</span>
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className={showHeader ? "p-2" : "pt-2 p-2"}>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-2">
            <CalendarIcon className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <h3 className="text-sm font-semibold mb-1">No upcoming events</h3>
            <p className="text-muted-foreground text-xs">Check back later!</p>
          </div>
        ) : (
          <ScrollArea className="h-40">
            <div className="space-y-1 pr-2">
            {upcomingEvents.map(event => {
              const isSelected = selectedEvent?.id === event.id;
              return (
                <EventHoverCard key={event.id} event={event} canEdit={false}>
                  <div
                    className={`
                      flex items-start gap-2 p-2 border border-border rounded 
                      cursor-pointer transition-all duration-200 touch-manipulation
                      ${isSelected 
                        ? 'ring-1 ring-primary scale-[1.01] shadow border-primary'
                        : 'hover:shadow hover:border-primary/50 active:scale-[0.99]'
                      }
                    `}
                    onClick={() => setSelectedEvent(event)}
                  >
                <div className="text-center min-w-[24px]">
                  <div className="text-sm font-bold text-primary">
                    {format(parseISO(event.start_date), 'd')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(event.start_date), 'MMM')}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <h4 className="font-medium text-xs truncate">{event.title}</h4>
                    <Badge className={`${getEventTypeColor(event.event_type)} text-xs flex-shrink-0 px-1 py-0`}>
                      {event.event_type || 'Event'}
                    </Badge>
                  </div>
                  
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                       <div className="flex items-center gap-1">
                         <ClockIcon className="h-2.5 w-2.5 flex-shrink-0" />
                         <span>{format(parseISO(event.start_date), 'h:mm a')}</span>
                       </div>
                     
                     {event.location && (
                       <div className="flex items-center gap-1">
                         <MapPinIcon className="h-2.5 w-2.5 flex-shrink-0" />
                         <span className="truncate">{event.location}</span>
                       </div>
                     )}
                   </div>
                </div>
              </div>
              </EventHoverCard>
            );
            })}
            </div>
          </ScrollArea>
        )}
        
        <EventDetailDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
          onEventUpdated={() => {
            // Refresh events when updated
            setSelectedEvent(null);
          }}
        />
      </CardContent>
    </Card>
  );
};