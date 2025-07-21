
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationDelivery } from '@/hooks/useNotificationDelivery';
import SMSDeliveryStatus from './SMSDeliveryStatus';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const NotificationHistoryWithDelivery = () => {
  const { notifications, loading, markAsRead } = useNotifications();
  const { deliveryLogs, loadDeliveryLogs } = useNotificationDelivery();
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  // Debug logging
  console.log('NotificationHistoryWithDelivery:', {
    notificationsCount: notifications?.length || 0,
    loading,
    deliveryLogsCount: deliveryLogs?.length || 0
  });

  useEffect(() => {
    loadDeliveryLogs();
  }, []);

  const toggleExpanded = (notificationId: string) => {
    const newExpanded = new Set(expandedNotifications);
    if (newExpanded.has(notificationId)) {
      newExpanded.delete(notificationId);
    } else {
      newExpanded.add(notificationId);
    }
    setExpandedNotifications(newExpanded);
  };

  const getDeliveryLogsForNotification = (notificationId: string) => {
    return deliveryLogs.filter(log => log.notification_id === notificationId);
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" text="Loading notifications..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-brand-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600 text-sm">You're all caught up!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => {
        const isExpanded = expandedNotifications.has(notification.id);
        const deliveryLogsForNotification = getDeliveryLogsForNotification(notification.id);
        
        return (
          <Card 
            key={notification.id} 
            className={!notification.is_read ? 'ring-2 ring-brand-400/50' : ''}
          >
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-gray-900 flex items-start gap-2 text-2xl sm:text-lg">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
                    <span className="break-words">{notification.title}</span>
                    {!notification.is_read && (
                      <Badge className="bg-brand-600 text-white text-xs ml-2 flex-shrink-0">New</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-600 text-xs sm:text-sm">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                    <Badge className={`${getNotificationColor(notification.type)} text-xs`}>
                      {notification.type}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!notification.is_read && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="border-brand-300 text-brand-700 hover:bg-brand-50 text-xs px-2 py-1"
                    >
                      <Check className="h-3 w-3" />
                      <span className="sr-only">Mark as read</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(notification.id)}
                    className="text-xs px-2 py-1"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-700 mb-2 text-sm break-words">{notification.message}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>{new Date(notification.created_at).toLocaleString()}</span>
              </div>
              
              {isExpanded && deliveryLogsForNotification.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Delivery Status</h4>
                  <div className="space-y-3">
                    {deliveryLogsForNotification.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium capitalize">
                            {log.delivery_method}
                          </span>
                          {log.delivery_method === 'sms' && (
                            <SMSDeliveryStatus
                              notification_id={log.notification_id}
                              delivery_method={log.delivery_method}
                            />
                          )}
                          {log.delivery_method !== 'sms' && (
                            <Badge variant={
                              log.status === 'delivered' ? 'default' :
                              log.status === 'failed' ? 'destructive' :
                              'secondary'
                            }>
                              {log.status}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.sent_at && new Date(log.sent_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
