import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, Clock, AlertCircle, Info, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

type Notification = Database['public']['Tables']['gw_notifications']['Row'];

const NotificationCenter = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  // Real-time activity detection
  useEffect(() => {
    if (notifications.length > lastNotificationCount && lastNotificationCount > 0) {
      setHasNewActivity(true);
      setIsActive(true);
      
      // Play notification sound (if browser allows)
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp56hVFApGn+DyvmYeCSCN2e/AcyQGLn/J8diKOQocYbzz6KJQEAR');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
      
      // Auto-open for high priority notifications
      const highPriorityNotifications = notifications.filter(n => !n.is_read && n.priority >= 2);
      if (highPriorityNotifications.length > 0) {
        setOpen(true);
      }
      
      // Clear activity indicator after 3 seconds
      setTimeout(() => {
        setHasNewActivity(false);
        setIsActive(false);
      }, 3000);
    }
    setLastNotificationCount(notifications.length);
  }, [notifications.length, lastNotificationCount]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('notification_activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gw_notifications'
        },
        (payload) => {
          console.log('New notification received:', payload);
          setHasNewActivity(true);
          setIsActive(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Activity pulse effect
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setIsActive(prev => !prev);
      }, 1000);
      
      setTimeout(() => {
        clearInterval(interval);
        setIsActive(false);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [hasNewActivity]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'announcement':
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3: return 'bg-red-100 border-red-200 shadow-sm';
      case 2: return 'bg-orange-100 border-orange-200 shadow-sm';
      case 1: return 'bg-blue-100 border-blue-200 shadow-sm';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`relative transition-all duration-300 ${
            hasNewActivity 
              ? 'animate-pulse bg-blue-50 hover:bg-blue-100 border border-blue-200' 
              : ''
          } ${
            isActive 
              ? 'ring-2 ring-blue-300 ring-opacity-50 shadow-lg' 
              : ''
          }`}
        >
          <Bell className={`h-5 w-5 transition-transform duration-200 ${
            hasNewActivity ? 'scale-110 text-blue-600' : 'text-current'
          }`} />
          {hasNewActivity && (
            <Zap className="h-3 w-3 absolute -top-0.5 -left-0.5 text-yellow-500 animate-bounce" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className={`absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs transition-transform duration-300 ${
                hasNewActivity ? 'scale-125 animate-bounce' : ''
              }`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-xl border-2" align="end">
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold">Activity Center</h3>
              {hasNewActivity && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 ml-1 font-medium">LIVE</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  className="text-xs hover:bg-blue-100"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
          {unreadCount > 0 ? (
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="default" className="animate-pulse">
                {unreadCount} active
              </Badge>
              <p className="text-xs text-muted-foreground">
                notification{unreadCount !== 1 ? 's' : ''} awaiting action
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">All caught up! 🎉</p>
          )}
        </div>
        
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.02] hover:shadow-md ${
                      !notification.is_read 
                        ? `${getPriorityColor(notification.priority)} border-l-4 ${
                            notification.priority >= 2 ? 'border-l-red-500' : 'border-l-blue-500'
                          }` 
                        : 'bg-white hover:bg-gray-50'
                    } ${!notification.is_read ? 'border' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5 relative">
                        {getNotificationIcon(notification.type)}
                        {!notification.is_read && notification.priority >= 2 && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium truncate ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.title}
                            {!notification.is_read && notification.priority >= 2 && (
                              <span className="ml-2 text-red-500 text-xs font-bold">URGENT</span>
                            )}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 animate-pulse" />
                          )}
                        </div>
                        <p className={`text-xs mt-1 line-clamp-2 ${
                          !notification.is_read ? 'text-gray-700' : 'text-gray-500'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          {notification.action_label && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs transition-colors ${
                                !notification.is_read ? 'bg-blue-50 border-blue-200 text-blue-700' : ''
                              }`}
                            >
                              {notification.action_label}
                            </Badge>
                          )}
                        </div>
                        {notification.category !== 'general' && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs mt-1 ${
                              !notification.is_read ? 'bg-gray-200 text-gray-700' : ''
                            }`}
                          >
                            {notification.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < notifications.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 text-xs hover:bg-blue-100 transition-colors"
                onClick={() => window.location.href = '/exec-board'}
              >
                Communications Hub
              </Button>
              <div className="flex items-center ml-2">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse mr-1"></div>
                <span className="text-xs text-gray-500">Live</span>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;