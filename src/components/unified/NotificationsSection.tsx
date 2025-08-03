import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNotifications } from "@/hooks/useNotifications";
import { 
  Bell, 
  CheckCircle, 
  AlertCircle,
  Info,
  Clock,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Folder
} from "lucide-react";
import { format } from "date-fns";

interface NotificationsSectionProps {
  className?: string;
}

export const NotificationsSection = ({ className }: NotificationsSectionProps) => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    loadNotifications, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  const [isReadSectionOpen, setIsReadSectionOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sms_notification':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'sms_notification':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button 
            onClick={markAllAsRead} 
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Mail className="h-3 w-3 mr-1" />
            Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <div className="text-center py-4">
              <Bell className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">No notifications</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {/* Unread Notifications */}
            {notifications.filter(n => !n.is_read).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900">Unread</h4>
                {notifications.filter(n => !n.is_read).map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`${getNotificationColor(notification.type || 'default')} border-l-2 border-l-blue-500`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 flex-1">
                          {getNotificationIcon(notification.type || 'default')}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <h5 className="font-medium text-sm text-gray-900 truncate">
                                {notification.title}
                              </h5>
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                              {notification.type === 'sms_notification' && (
                                <Badge variant="outline" className="text-xs">
                                  SMS
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 mb-1 line-clamp-2">{notification.message}</p>
                            {notification.metadata && typeof notification.metadata === 'object' && 'sender_phone' in notification.metadata && (
                              <p className="text-xs text-gray-500 mb-1">
                                From: {notification.metadata.sender_phone as string}
                              </p>
                            )}
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(notification.created_at), 'MMM dd, h:mm a')}
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="h-6 w-6 p-0"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Read Notifications Folder */}
            {notifications.filter(n => n.is_read).length > 0 && (
              <Collapsible open={isReadSectionOpen} onOpenChange={setIsReadSectionOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg w-full justify-start">
                    <Folder className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-sm text-gray-700">
                      Read Notifications ({notifications.filter(n => n.is_read).length})
                    </span>
                    {isReadSectionOpen ? (
                      <ChevronDown className="h-3 w-3 text-gray-500 ml-auto" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-gray-500 ml-auto" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-3 mt-2">
                  {notifications.filter(n => n.is_read).map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={`${getNotificationColor(notification.type || 'default')} opacity-75`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-2">
                          {getNotificationIcon(notification.type || 'default')}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <h5 className="font-medium text-sm text-gray-900 truncate">
                                {notification.title}
                              </h5>
                              {notification.type === 'sms_notification' && (
                                <Badge variant="outline" className="text-xs">
                                  SMS
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 mb-1 line-clamp-2">{notification.message}</p>
                            {notification.metadata && typeof notification.metadata === 'object' && 'sender_phone' in notification.metadata && (
                              <p className="text-xs text-gray-500 mb-1">
                                From: {notification.metadata.sender_phone as string}
                              </p>
                            )}
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(notification.created_at), 'MMM dd, h:mm a')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};