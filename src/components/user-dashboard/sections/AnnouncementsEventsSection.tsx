import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Clock } from "lucide-react";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useEffect } from "react";

interface AnnouncementsEventsSectionProps {
  upcomingEvents?: Array<{
    id: string;
    title: string;
    date: string;
    location?: string;
    type?: string;
  }>;
}

export const AnnouncementsEventsSection = ({ upcomingEvents }: AnnouncementsEventsSectionProps) => {
  const { announcements, loading, refetch } = useAnnouncements();

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'rehearsal': return 'bg-blue-100 text-blue-800';
      case 'performance': return 'bg-purple-100 text-purple-800';
      case 'tour': return 'bg-green-100 text-green-800';
      case 'communication': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="bg-gradient-to-r from-secondary/5 via-accent/5 to-primary/5 border-secondary/20 shadow-lg h-64">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-secondary-foreground text-base">
          <Bell className="h-4 w-4" />
          Notifications
          <Badge variant="secondary" className="text-xs">
            {announcements.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-44">
          <div className="space-y-2 pr-4">
            {loading ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-4">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No new notifications</p>
              </div>
            ) : (
              announcements.map((notification) => (
                <div key={notification.id} className="border border-secondary/10 rounded-lg p-3 bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium text-base text-foreground line-clamp-1">{notification.title}</h5>
                    {notification.announcement_type && (
                      <Badge className={`${getNotificationTypeColor(notification.announcement_type)} text-sm ml-2`} variant="secondary">
                        {notification.announcement_type}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {notification.content}
                  </p>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {notification.created_at 
                      ? new Date(notification.created_at).toLocaleString()
                      : 'Recently posted'
                    }
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};