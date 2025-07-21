
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface NotificationDeliveryLog {
  id: string;
  notification_id: string;
  user_id: string;
  delivery_method: 'internal' | 'email' | 'sms' | 'push';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  external_id?: string;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  created_at: string;
}

export const useNotificationDelivery = () => {
  const { user } = useAuth();
  const [deliveryLogs, setDeliveryLogs] = useState<NotificationDeliveryLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Load delivery logs for user's notifications
  const loadDeliveryLogs = async (notificationId?: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('gw_notification_delivery_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (notificationId) {
        query = query.eq('notification_id', notificationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading delivery logs:', error);
        return;
      }

      setDeliveryLogs(data?.map(log => ({
        ...log,
        delivery_method: log.delivery_method as 'internal' | 'email' | 'sms' | 'push',
        status: log.status as 'pending' | 'sent' | 'delivered' | 'failed'
      })) || []);
    } catch (error) {
      console.error('Error loading delivery logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get delivery status for a specific notification
  const getDeliveryStatus = (notificationId: string, method: string) => {
    return deliveryLogs.find(log => 
      log.notification_id === notificationId && 
      log.delivery_method === method
    );
  };

  // Send SMS notification
  const sendSMSNotification = async (
    phoneNumber: string, 
    message: string, 
    notificationId?: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('gw-send-sms', {
        body: {
          to: phoneNumber,
          message: message,
          notificationId: notificationId
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast.success('SMS sent successfully');
        
        // Refresh delivery logs if notification ID provided
        if (notificationId) {
          await loadDeliveryLogs(notificationId);
        }
        
        return true;
      } else {
        throw new Error(data.error || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      toast.error(`Failed to send SMS: ${error.message}`);
      return false;
    }
  };

  // Update delivery status (for manual status updates)
  const updateDeliveryStatus = async (
    deliveryId: string,
    status: 'pending' | 'sent' | 'delivered' | 'failed',
    errorMessage?: string
  ) => {
    try {
      const updates: any = { status };
      
      if (status === 'sent') {
        updates.sent_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      } else if (status === 'failed' && errorMessage) {
        updates.error_message = errorMessage;
      }

      const { error } = await supabase
        .from('gw_notification_delivery_log')
        .update(updates)
        .eq('id', deliveryId);

      if (error) {
        throw error;
      }

      // Refresh delivery logs
      await loadDeliveryLogs();
      
      return true;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      return false;
    }
  };

  // Load delivery logs when component mounts
  useEffect(() => {
    if (user) {
      loadDeliveryLogs();
    }
  }, [user]);

  return {
    deliveryLogs,
    loading,
    loadDeliveryLogs,
    getDeliveryStatus,
    sendSMSNotification,
    updateDeliveryStatus
  };
};
