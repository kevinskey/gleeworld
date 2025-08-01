import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type Notification = Database['public']['Tables']['gw_notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['gw_notifications']['Insert'];

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load notifications
  const loadNotifications = async (limit = 50) => {
    if (!user) {
      console.log('No user found, cannot load notifications');
      return;
    }
    
    console.log('Loading notifications for user:', user.id);
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      console.log('Notifications query result:', { data, error });

      if (error) {
        console.error('Error loading notifications:', error);
        toast.error('Failed to load notifications');
        return;
      }

      console.log('Setting notifications:', data);
      setNotifications(data || []);
      const unread = data?.filter(n => !n.is_read).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true } 
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('gw_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  };

  // Create notification (admin function)
  const createNotification = async (notificationData: NotificationInsert) => {
    try {
      const { data, error } = await supabase
        .from('gw_notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        toast.error('Failed to create notification');
        return null;
      }

      toast.success('Notification created successfully');
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Failed to create notification');
      return null;
    }
  };

  // Send notification with delivery options
  const sendNotification = async (
    userId: string,
    title: string,
    message: string,
    options: {
      type?: string;
      category?: string;
      actionUrl?: string;
      actionLabel?: string;
      metadata?: any;
      priority?: number;
      expiresAt?: string;
      sendEmail?: boolean;
      sendSms?: boolean;
    } = {}
  ) => {
    try {
      const { data, error } = await supabase.rpc('create_notification_with_delivery', {
        p_user_id: userId,
        p_title: title,
        p_message: message,
        p_type: options.type || 'info',
        p_category: options.category || 'general',
        p_action_url: options.actionUrl || null,
        p_action_label: options.actionLabel || null,
        p_metadata: options.metadata || {},
        p_priority: options.priority || 0,
        p_expires_at: options.expiresAt || null,
        p_send_email: options.sendEmail || false,
        p_send_sms: options.sendSms || false
      });

      if (error) {
        console.error('Error sending notification:', error);
        toast.error('Failed to send notification');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
      return null;
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channelName = `notifications-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gw_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notification
          toast(newNotification.title, {
            description: newNotification.message,
            action: newNotification.action_url ? {
              label: newNotification.action_label || 'View',
              onClick: () => window.location.href = newNotification.action_url!
            } : undefined
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gw_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications(prev => 
            prev.map(n => 
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
          
          // Update unread count
          if (updatedNotification.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load notifications on mount
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    sendNotification
  };
};