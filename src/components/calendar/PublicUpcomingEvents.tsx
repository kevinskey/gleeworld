import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";

interface PublicUpcomingEventsProps {
  limit?: number;
  showHeader?: boolean;
}

export const PublicUpcomingEvents = ({ limit = 6, showHeader = true }: PublicUpcomingEventsProps) => {
  const { events, loading } = usePublicGleeWorldEvents();
  
  const upcomingEvents = events.slice(0, limit);

  if (loading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Upcoming Public Events
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5" />
            Upcoming Public Events
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No upcoming public events</p>
          </div>
        ) : (
          upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground line-clamp-1">
                  {event.title}
                </h3>
                <Badge variant="secondary" className="ml-2 shrink-0">
                  {event.event_type || 'Event'}
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 shrink-0" />
                  <span className="line-clamp-1">
                    {format(new Date(event.start_date), 'PPP p')}
                    {event.end_date && (
                      <span> - {format(new Date(event.end_date), 'p')}</span>
                    )}
                  </span>
                </div>
                
                {(event.location || event.venue_name) && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4 shrink-0" />
                    <span className="line-clamp-1">
                      {event.venue_name || event.location}
                    </span>
                  </div>
                )}
              </div>
              
              {event.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};