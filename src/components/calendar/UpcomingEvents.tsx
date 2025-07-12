import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useState } from "react";
import { EventDetailDialog } from "./EventDetailDialog";
import { EventHoverCard } from "./EventHoverCard";

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
      case 'sectionals':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
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
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <CalendarIcon className="h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline">Upcoming Events</span>
            <span className="sm:hidden">Events</span>
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className={showHeader ? "p-3 md:p-6" : "pt-3 md:pt-6 p-3 md:p-6"}>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-4 md:py-8">
            <CalendarIcon className="h-8 w-8 md:h-12 md:w-12 mx-auto text-muted-foreground mb-2 md:mb-4" />
            <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2">No upcoming events</h3>
            <p className="text-muted-foreground text-sm md:text-base">Check back later for new events!</p>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-4 max-h-96 overflow-y-auto">
            {upcomingEvents.map(event => {
              const isSelected = selectedEvent?.id === event.id;
              return (
                <EventHoverCard key={event.id} event={event} canEdit={false}>
                  <div
                    className={`
                      flex items-start gap-2 md:gap-4 p-3 md:p-4 border border-border rounded-lg 
                      cursor-pointer transition-all duration-200 touch-manipulation
                      ${isSelected 
                        ? 'ring-2 ring-primary ring-offset-2 scale-[1.01] shadow-lg border-primary'
                        : 'hover:shadow-lg hover:border-primary/50 active:scale-[0.99]'
                      }
                    `}
                    onClick={() => setSelectedEvent(event)}
                  >
                <div className="text-center min-w-[40px] md:min-w-[60px]">
                  <div className="text-lg md:text-2xl font-bold text-primary">
                    {format(new Date(event.start_date), 'd')}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    {format(new Date(event.start_date), 'MMM')}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                    <h4 className="font-semibold text-sm md:text-base truncate">{event.title}</h4>
                    <Badge className={`${getEventTypeColor(event.event_type)} text-xs flex-shrink-0`}>
                      {event.event_type || 'Event'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-0.5 md:space-y-1 text-xs md:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-3 w-3 flex-shrink-0" />
                      <span>{format(new Date(event.start_date), 'h:mm a')}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-3 w-3 flex-shrink-0" />
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