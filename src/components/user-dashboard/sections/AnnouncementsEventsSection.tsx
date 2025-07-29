import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Megaphone, Clock, MapPin } from "lucide-react";

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
  // Mock announcements data - this could be replaced with real data from hooks
  const announcements = [
    {
      id: "1",
      title: "Rehearsal Schedule Update",
      message: "Tuesday rehearsal moved to 7:30 PM in Morgan Auditorium.",
      date: new Date().toISOString(),
      priority: "high"
    },
    {
      id: "2", 
      title: "Homecoming Performance",
      message: "Don't forget to pick up your performance attire from the wardrobe coordinator.",
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      priority: "medium"
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-secondary/10 text-secondary-foreground border-secondary/20';
      default: return 'bg-muted text-muted-foreground border-muted-foreground/20';
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
      <CardContent className="space-y-1 h-32 overflow-hidden">
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
                  <Badge className={`${getPriorityColor(announcement.priority)} text-xs`} variant="secondary">
                    {announcement.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                  {announcement.message}
                </p>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2 w-2" />
                  {new Date(announcement.date).toLocaleDateString()}
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
                    {new Date(event.date).toLocaleDateString()}
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
      </CardContent>
    </Card>
  );
};