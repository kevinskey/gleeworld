import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { parseISO } from "date-fns";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useState } from "react";
import { EventDetailDialog } from "./EventDetailDialog";
import { EventHoverCard } from "./EventHoverCard";
import { getEventTypeColor } from "@/utils/colorUtils";

export const NextEventCard = () => {
  const { getUpcomingEvents, loading } = useGleeWorldEvents();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const upcomingEvents = getUpcomingEvents(1); // Only get the next event
  const nextEvent = upcomingEvents[0];

  if (loading) {
    return (
      <Card className="glass-dashboard-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse">Loading next event...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextEvent) {
    return (
      <Card className="glass-dashboard-card">
        <CardContent className="p-4">
          <div className="text-center py-4">
            <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold mb-1">No upcoming events</h3>
            <p className="text-muted-foreground">Check back later for new events!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarIcon className="h-5 w-5" />
          Next Event
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <EventHoverCard event={nextEvent} canEdit={false}>
          <div
            className="flex items-start gap-4 p-4 border border-border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 active:scale-[0.99] glass-upload-zone"
            onClick={() => setSelectedEvent(nextEvent)}
          >
            {nextEvent.image_url && (
              <div className="w-16 h-16 flex-shrink-0">
                <img
                  src={nextEvent.image_url}
                  alt={nextEvent.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}
            <div className="text-center min-w-[48px]">
              <div className="text-2xl font-bold text-primary">
                {format(parseISO(nextEvent.start_date), 'd')}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(parseISO(nextEvent.start_date), 'MMM')}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg truncate">{nextEvent.title}</h3>
                <Badge className={`${getEventTypeColor(nextEvent.event_type)} flex-shrink-0`}>
                  {nextEvent.event_type || 'Event'}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {format(parseISO(nextEvent.start_date), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                  </span>
                </div>
                
                {nextEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                    <span>{nextEvent.location}</span>
                  </div>
                )}
                
                {nextEvent.description && (
                  <p className="text-sm mt-2 line-clamp-2 leading-relaxed">{nextEvent.description}</p>
                )}
              </div>
            </div>
          </div>
        </EventHoverCard>
        
        <EventDetailDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
          onEventUpdated={() => {
            setSelectedEvent(null);
          }}
        />
      </CardContent>
    </Card>
  );
};