import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useEffect } from "react";

export const NotificationsSection = () => {
  const { announcements, loading, refetch } = useAnnouncements();
  const [isCollapsed, setIsCollapsed] = useState(true);

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
    <div className="w-full">
      {/* Desktop Layout */}
      <div className="hidden md:block">
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
      </div>

      {/* Mobile Layout - Collapsible */}
      <div className="md:hidden">
        <Card className="bg-gradient-to-r from-secondary/5 via-accent/5 to-primary/5 border-secondary/20 shadow-lg">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
            <CardTitle className="flex items-center justify-between text-secondary-foreground text-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
                <Badge variant="secondary" className="text-xs">
                  {announcements.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          
          {!isCollapsed && (
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2 pr-4">
                  {loading ? (
                    <div className="text-center py-2">
                      <p className="text-sm text-muted-foreground">Loading notifications...</p>
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="text-center py-2">
                      <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm text-muted-foreground">No new notifications</p>
                    </div>
                  ) : (
                    announcements.slice(0, 3).map((notification) => (
                      <div key={notification.id} className="border border-secondary/10 rounded-lg p-2 bg-background/50">
                        <h5 className="font-medium text-sm text-foreground line-clamp-1 mb-1">{notification.title}</h5>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {notification.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};