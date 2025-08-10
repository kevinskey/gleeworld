import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
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

export default function Notifications() {
  const navigate = useNavigate();
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
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
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
      <UniversalLayout>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" text="Loading notifications..." />
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Notifications</h1>
                <p className="text-gray-600">Stay updated with your latest notifications including SMS messages</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <>
                  <Badge variant="destructive" className="text-sm px-3 py-1">
                    {unreadCount} unread
                  </Badge>
                  <Button 
                    onClick={markAllAsRead} 
                    variant="outline"
                    className="bg-white hover:bg-gray-50"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Mark All Read
                  </Button>
                </>
              )}
              {unreadCount === 0 && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  All caught up!
                </Badge>
              )}
              <Button onClick={() => navigate('/community-hub')}>
                Open Community Hub
              </Button>
            </div>
          </div>
        </div>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-600">You're all caught up! No new notifications.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Unread Notifications */}
            {notifications.filter(n => !n.is_read).length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Unread Notifications</h2>
                {notifications.filter(n => !n.is_read).map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`${getNotificationColor(notification.type || 'default')} border-l-4 border-l-blue-500`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getNotificationIcon(notification.type || 'default')}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">
                                {notification.title}
                              </h4>
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                              {notification.type === 'sms_notification' && (
                                <Badge variant="outline" className="text-xs">
                                  SMS
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-700 mb-2">{notification.message}</p>
                            {notification.metadata && typeof notification.metadata === 'object' && 'sender_phone' in notification.metadata && (
                              <p className="text-xs text-gray-500 mb-2">
                                From: {notification.metadata.sender_phone as string}
                              </p>
                            )}
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(notification.created_at), 'MMM dd, yyyy h:mm a')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Read Notifications Folder */}
            {notifications.filter(n => n.is_read).length > 0 && (
              <Collapsible open={isReadSectionOpen} onOpenChange={setIsReadSectionOpen}>
                <div className="mb-4">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
                      <Folder className="h-5 w-5 text-gray-500" />
                      <span className="font-medium text-gray-700">
                        Read Notifications ({notifications.filter(n => n.is_read).length})
                      </span>
                      {isReadSectionOpen ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent className="space-y-4">
                  {notifications.filter(n => n.is_read).map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={`${getNotificationColor(notification.type || 'default')} opacity-75`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            {getNotificationIcon(notification.type || 'default')}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900">
                                  {notification.title}
                                </h4>
                                {notification.type === 'sms_notification' && (
                                  <Badge variant="outline" className="text-xs">
                                    SMS
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-700 mb-2">{notification.message}</p>
                              {notification.metadata && typeof notification.metadata === 'object' && 'sender_phone' in notification.metadata && (
                                <p className="text-xs text-gray-500 mb-2">
                                  From: {notification.metadata.sender_phone as string}
                                </p>
                              )}
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(new Date(notification.created_at), 'MMM dd, yyyy h:mm a')}
                              </div>
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
        )}
      </div>
    </UniversalLayout>
  );
}