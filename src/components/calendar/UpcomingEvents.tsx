import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, ClockIcon, ArrowRightIcon } from "lucide-react";
import { format } from "date-fns";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useState } from "react";
import { EventDetailDialog } from "./EventDetailDialog";

interface UpcomingEventsProps {
  limit?: number;
  showHeader?: boolean;
}

export const UpcomingEvents = ({ limit = 6, showHeader = true }: UpcomingEventsProps) => {
  const { getUpcomingEvents, loading } = useGleeWorldEvents();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const upcomingEvents = getUpcomingEvents(limit);

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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
            <Button variant="ghost" size="sm">
              View All
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
      )}
      
      <CardContent className={showHeader ? "" : "pt-6"}>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
            <p className="text-muted-foreground">Check back later for new events!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingEvents.map(event => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-4 border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="text-center min-w-[60px]">
                  <div className="text-2xl font-bold text-primary">
                    {format(new Date(event.start_date), 'd')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(event.start_date), 'MMM')}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{event.title}</h4>
                    <Badge className={getEventTypeColor(event.event_type)}>
                      {event.event_type || 'Event'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      <span>{format(new Date(event.start_date), 'h:mm a')}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <EventDetailDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      </CardContent>
    </Card>
  );
};