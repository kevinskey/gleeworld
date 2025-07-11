import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, MapPinIcon, ClockIcon, UsersIcon } from "lucide-react";
import { format } from "date-fns";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { EventDetailDialog } from "./EventDetailDialog";

interface EventsListProps {
  events: GleeWorldEvent[];
  onEventUpdated?: () => void;
}

export const EventsList = ({ events, onEventUpdated }: EventsListProps) => {
  const [selectedEvent, setSelectedEvent] = useState<GleeWorldEvent | null>(null);

  const getEventTypeColor = (type: string | null) => {
    switch (type) {
      case 'performance':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'rehearsal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'meeting':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
        <p className="text-muted-foreground">Check back later for new events!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4">Upcoming Events</h3>
      
      {events.map(event => (
        <Card key={event.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-3 md:p-4" onClick={() => setSelectedEvent(event)}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <h4 className="font-semibold text-base md:text-lg">{event.title}</h4>
                  <Badge className={getEventTypeColor(event.event_type)}>
                    {event.event_type || 'Event'}
                  </Badge>
                </div>
                
                {event.description && (
                  <p className="text-muted-foreground mb-3 line-clamp-2 text-sm md:text-base">
                    {event.description}
                  </p>
                )}
                
                <div className="space-y-1 md:space-y-2">
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <CalendarIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      <span className="hidden sm:inline">{format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}</span>
                      <span className="sm:hidden">{format(new Date(event.start_date), 'MMM d, yyyy')}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <ClockIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      {format(new Date(event.start_date), 'h:mm a')}
                      {event.end_date && (
                        <> - {format(new Date(event.end_date), 'h:mm a')}</>
                      )}
                    </span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <MapPinIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">
                        {event.venue_name && `${event.venue_name}, `}
                        {event.location}
                      </span>
                    </div>
                  )}
                  
                  {event.max_attendees && (
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <UsersIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                      <span>Max {event.max_attendees} attendees</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <Button variant="outline" size="sm" className="text-xs md:text-sm h-7 md:h-8">
                  <span className="hidden sm:inline">View Details</span>
                  <span className="sm:hidden">View</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <EventDetailDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        onEventUpdated={onEventUpdated}
      />
    </div>
  );
};