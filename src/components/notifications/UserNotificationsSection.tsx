import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Mail, MessageSquare, Monitor, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  action_label?: string;
  priority: number;
}

interface DeliveryLog {
  id: string;
  notification_id: string;
  delivery_method: string;
  status: string;
  sent_at: string;
  delivered_at?: string;
  error_message?: string;
  notification: {
    title: string;
    message: string;
    type: string;
  };
}

export function UserNotificationsSection() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchDeliveryHistory();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('gw_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    }
  };

  const fetchDeliveryHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('gw_notification_delivery_log')
      .select(`
        *,
        notification:gw_notifications(title, message, type)
      `)
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching delivery history:', error);
    } else {
      setDeliveryHistory(data || []);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('gw_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getDeliveryIcon = (method: string) => {
    switch (method) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'internal': return <Monitor className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 3) return 'destructive';
    if (priority >= 2) return 'default';
    return 'secondary';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading notifications...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Your Notifications
            </CardTitle>
            <CardDescription>
              Recent notifications and delivery history
            </CardDescription>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} unread</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent">Recent Notifications</TabsTrigger>
            <TabsTrigger value="history">Delivery History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent" className="space-y-4">
            <ScrollArea className="h-64">
              {notifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No notifications yet
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border ${
                        !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <Badge 
                              variant={getPriorityColor(notification.priority)}
                              className="text-xs"
                            >
                              {notification.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            {!notification.is_read && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 text-xs"
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <ScrollArea className="h-64">
              {deliveryHistory.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No delivery history yet
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveryHistory.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getDeliveryIcon(log.delivery_method)}
                            <span className="font-medium text-sm capitalize">
                              {log.delivery_method}
                            </span>
                            {getStatusIcon(log.status)}
                            <Badge variant="outline" className="text-xs">
                              {log.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">
                            {log.notification?.title}
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            {log.notification?.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Sent {formatDistanceToNow(new Date(log.sent_at), { addSuffix: true })}
                            </span>
                            {log.delivered_at && (
                              <span className="text-xs text-green-600">
                                Delivered {formatDistanceToNow(new Date(log.delivered_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          {log.error_message && (
                            <p className="text-xs text-red-600 mt-1">
                              Error: {log.error_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}