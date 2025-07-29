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
  // Sort events by date (most recent first) - but actually show chronological order for upcoming events
  const sortedEvents = [...upcomingEvents].sort((a, b) => {
    const dateA = new Date(a.date || a.start_date);
    const dateB = new Date(b.date || b.start_date);
    return dateA.getTime() - dateB.getTime(); // Ascending order for upcoming events
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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Upcoming Events</CardTitle>
        <CardDescription className="text-base">Your next rehearsals and performances</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedEvents.length > 0 ? (
          <ScrollArea className="h-[180px]">
            <div className="space-y-2">
              {sortedEvents.map((event, index) => (
                <div 
                  key={event.id} 
                  className="group flex items-center justify-between p-3 border-l-4 border-primary/30 bg-card hover:bg-accent/50 hover:border-primary transition-all duration-200 rounded-r-md"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate text-base">
                      {event.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-sm md:text-base text-muted-foreground">
                         <div className="flex items-center gap-1">
                           <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                           <span>{formatEventDate(event.date || event.start_date)}</span>
                       </div>
                       {formatEventTime(event.date || event.start_date) && (
                         <div className="flex items-center gap-1">
                           <Clock className="h-4 w-4 md:h-5 md:w-5" />
                           <span>{formatEventTime(event.date || event.start_date)}</span>
                         </div>
                       )}
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 md:h-5 md:w-5" />
                          <span className="truncate max-w-[120px]">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    <div className="w-2 h-2 rounded-full bg-primary/60 group-hover:bg-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="h-16 w-16 mb-3 opacity-40" />
            <p className="text-center text-base">No upcoming events scheduled</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};