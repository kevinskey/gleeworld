import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Clock, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useUserDashboardContext } from "@/contexts/UserDashboardContext";
import { useEffect } from "react";
import { ItemDetailModal } from "../modals/ItemDetailModal";

export const NotificationsSection = () => {
  const { notifications, dashboardData, loading, refetch, markNotificationAsRead } = useUserDashboardContext();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);

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
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const unreadCount = dashboardData?.unread_notifications || 0;
  const displayNotifications = notifications.slice(0, 10); // Show latest 10

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
                {unreadCount > 0 ? `${unreadCount} unread` : notifications.length}
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
                ) : displayNotifications.length === 0 ? (
                  <div className="text-center py-4">
                    <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  displayNotifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`border rounded-lg p-3 backdrop-blur-sm hover:bg-background/70 transition-colors cursor-pointer relative ${
                        !notification.is_read 
                          ? 'border-secondary/20 bg-background/60 ring-1 ring-primary/20' 
                          : 'border-secondary/10 bg-background/50'
                      }`}
                      onClick={() => setSelectedItem({
                        id: notification.id,
                        title: notification.title,
                        content: notification.message,
                        type: 'notification' as const,
                        subType: notification.type,
                        actionRequired: !notification.is_read
                      })}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className={`font-medium text-base line-clamp-1 ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </h5>
                        <div className="flex items-center gap-2 ml-2">
                          {notification.type && (
                            <Badge className={`${getNotificationTypeColor(notification.type)} text-xs`} variant="secondary">
                              {notification.type}
                            </Badge>
                          )}
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationAsRead(notification.id);
                              }}
                              className="h-6 w-6 p-0 hover:bg-primary/10"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {notification.created_at 
                          ? new Date(notification.created_at).toLocaleString()
                          : 'Recently posted'
                        }
                      </div>
                      {!notification.is_read && (
                        <div className="absolute top-2 left-2 w-2 h-2 bg-primary rounded-full"></div>
                      )}
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
                  {unreadCount > 0 ? `${unreadCount} unread` : notifications.length}
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
                    ) : displayNotifications.length === 0 ? (
                      <div className="text-center py-2">
                        <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm text-muted-foreground">No notifications</p>
                      </div>
                    ) : (
                      displayNotifications.slice(0, 3).map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`border rounded-lg p-2 cursor-pointer hover:bg-background/70 transition-colors relative ${
                            !notification.is_read 
                              ? 'border-secondary/20 bg-background/60 ring-1 ring-primary/20' 
                              : 'border-secondary/10 bg-background/50'
                          }`}
                          onClick={() => setSelectedItem({
                            id: notification.id,
                            title: notification.title,
                            content: notification.message,
                            type: 'notification' as const,
                            subType: notification.type,
                            actionRequired: !notification.is_read
                          })}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <h5 className={`font-medium text-sm line-clamp-1 ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </h5>
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markNotificationAsRead(notification.id);
                                }}
                                className="h-4 w-4 p-0 ml-1"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {notification.message}
                          </p>
                          {!notification.is_read && (
                            <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-primary rounded-full"></div>
                          )}
                        </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      </div>

      <ItemDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem || { id: '', title: '', type: 'notification' as const }}
      />
    </div>
  );
};