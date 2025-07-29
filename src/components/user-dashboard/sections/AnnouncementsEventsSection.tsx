import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Megaphone, Clock, MapPin } from "lucide-react";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useEffect } from "react";

interface AnnouncementsEventsSectionProps {
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    location?: string;
    type?: string;
  }>;
}

export const AnnouncementsEventsSection = ({ upcomingEvents }: AnnouncementsEventsSectionProps) => {
  const { announcements, loading, refetch } = useAnnouncements();

  // Auto-refresh announcements every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const getAnnouncementTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'rehearsal': return 'bg-blue-100 text-blue-800';
      case 'performance': return 'bg-purple-100 text-purple-800';
      case 'tour': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="bg-gradient-to-r from-secondary/5 via-accent/5 to-primary/5 border-secondary/20 shadow-lg h-48">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2 text-secondary-foreground text-base">
          <Megaphone className="h-4 w-4" />
          Latest Updates
          <Calendar className="h-3 w-3 text-accent" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <ScrollArea className="h-32">
          <div className="space-y-1 pr-4">
            {/* Announcements */}
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-1">
                <Megaphone className="h-3 w-3" />
                Recent Announcements
              </h4>
              {announcements.length === 0 ? (
                <div className="text-center py-1">
                  <p className="text-sm text-muted-foreground">No recent announcements</p>
                </div>
              ) : (
                announcements.slice(0, 1).map((announcement) => (
                  <div key={announcement.id} className="border border-secondary/10 rounded-lg p-2 bg-background/50 backdrop-blur-sm">
                    <div className="flex items-start justify-between mb-1">
                      <h5 className="font-medium text-sm text-foreground line-clamp-1">{announcement.title}</h5>
                      {announcement.announcement_type && (
                        <Badge className={`${getAnnouncementTypeColor(announcement.announcement_type)} text-xs`} variant="secondary">
                          {announcement.announcement_type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {announcement.content}
                    </p>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2 w-2" />
                      {announcement.created_at 
                        ? new Date(announcement.created_at).toLocaleDateString()
                        : 'Recently posted'
                      }
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Upcoming Events */}
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Upcoming Events
              </h4>
              {(!upcomingEvents || upcomingEvents.length === 0) ? (
                <div className="text-center py-1">
                  <p className="text-sm text-muted-foreground">No upcoming events scheduled</p>
                </div>
              ) : (
                upcomingEvents.slice(0, 1).map((event) => (
                  <div key={event.id} className="border border-secondary/10 rounded-lg p-2 bg-background/50 backdrop-blur-sm">
                    <div className="flex items-start justify-between mb-1">
                      <h5 className="font-medium text-sm text-foreground line-clamp-1">{event.title}</h5>
                      {event.type && (
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-2 w-2" />
                        {(() => {
                          try {
                            const date = new Date(event.date);
                            return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
                          } catch (error) {
                            console.warn('Date parsing error:', event.date, error);
                            return 'Invalid date';
                          }
                        })()}
                      </div>
                      {event.location && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-2 w-2" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};