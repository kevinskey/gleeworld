import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationPayload {
  title: string;
  message: string;
  userId?: string;
  userIds?: string[];
  groupId?: string;
}

export const useMultiChannelNotifications = () => {
  const [sending, setSending] = useState(false);

  const sendNotification = async ({
    title,
    message,
    userId,
    userIds,
    groupId,
  }: NotificationPayload) => {
    setSending(true);

    try {
      const targetUsers = userId ? [userId] : userIds || [];

      // Fetch user preferences to determine which channels to use
      const { data: preferences } = await supabase
        .from('gw_notification_preferences')
        .select('user_id, push_enabled, email_enabled, sms_enabled, phone_number')
        .in('user_id', targetUsers);

      if (!preferences || preferences.length === 0) {
        console.warn('No user preferences found, skipping notifications');
        return {
          success: false,
          results: { push: 0, email: 0, sms: 0, errors: ['No user preferences configured'] },
        };
      }

      const results = {
        push: 0,
        email: 0,
        sms: 0,
        errors: [] as string[],
      };

      // Send push notifications
      const pushUsers = preferences.filter(p => p.push_enabled);
      if (pushUsers.length > 0) {
        try {
          const { error } = await supabase.functions.invoke('send-push-notification', {
            body: {
              userIds: pushUsers.map(p => p.user_id),
              title,
              message,
            },
          });

          if (error) throw error;
          results.push = pushUsers.length;
        } catch (error) {
          console.error('Push notification error:', error);
          results.errors.push('Failed to send push notifications');
        }
      }

      // Send SMS notifications
      const smsUsers = preferences.filter(p => p.sms_enabled && p.phone_number);
      if (smsUsers.length > 0) {
        try {
          for (const user of smsUsers) {
            const { error } = await supabase.functions.invoke('send-sms', {
              body: {
                to: user.phone_number,
                message: `${title}\n\n${message}`,
              },
            });

            if (error) {
              console.error('SMS error for user:', user.user_id, error);
              results.errors.push(`Failed to send SMS to ${user.phone_number}`);
            } else {
              results.sms++;
            }
          }
        } catch (error) {
          console.error('SMS notification error:', error);
          results.errors.push('Failed to send SMS notifications');
        }
      }

      // Send email notifications
      const emailUsers = preferences.filter(p => p.email_enabled);
      if (emailUsers.length > 0) {
        try {
          const { error } = await supabase.functions.invoke('gw-send-email', {
            body: {
              to: emailUsers.map(p => p.user_id),
              subject: title,
              html: `<p>${message}</p>`,
            },
          });

          if (error) throw error;
          results.email = emailUsers.length;
        } catch (error) {
          console.error('Email notification error:', error);
          results.errors.push('Failed to send email notifications');
        }
      }

      // Show summary toast
      const summary = [];
      if (results.push > 0) summary.push(`${results.push} push`);
      if (results.sms > 0) summary.push(`${results.sms} SMS`);
      if (results.email > 0) summary.push(`${results.email} email`);

      if (summary.length > 0) {
        toast.success(`Sent ${summary.join(', ')} notification${summary.length > 1 ? 's' : ''}`);
      }

      if (results.errors.length > 0) {
        results.errors.forEach(error => toast.error(error));
      }

      return {
        success: summary.length > 0,
        results,
      };
    } catch (error) {
      console.error('Multi-channel notification error:', error);
      toast.error('Failed to send notifications');
      return {
        success: false,
        results: { push: 0, email: 0, sms: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] },
      };
    } finally {
      setSending(false);
    }
  };

  return {
    sendNotification,
    sending,
  };
};
