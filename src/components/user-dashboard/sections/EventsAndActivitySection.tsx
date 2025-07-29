import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Calendar, MapPin, Clock } from "lucide-react";

interface EventsAndActivitySectionProps {
  upcomingEvents: any[];
  recentActivity: Array<{
    id: string;
    action: string;
    time: string;
    type: string;
  }>;
}

export const EventsAndActivitySection = ({ 
  upcomingEvents
}: EventsAndActivitySectionProps) => {
  // Sort events by date (most recent first)
  const sortedEvents = [...upcomingEvents].sort((a, b) => {
    const dateA = new Date(a.start_date);
    const dateB = new Date(b.start_date);
    return dateB.getTime() - dateA.getTime();
  });

  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date TBD';
      }
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Date TBD';
    }
  };

  const formatEventTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      return format(date, 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Upcoming Events</CardTitle>
        <CardDescription>Your next rehearsals and performances</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {sortedEvents.length > 0 ? (
          <ScrollArea className="h-full px-6 pb-6">
            <div className="space-y-3">
              {sortedEvents.map((event, index) => (
                <div 
                  key={event.id} 
                  className="group relative border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatEventDate(event.start_date)}</span>
                        </div>
                        {formatEventTime(event.start_date) && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatEventTime(event.start_date)}</span>
                          </div>
                        )}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-3 h-3 rounded-full bg-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No upcoming events scheduled</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};