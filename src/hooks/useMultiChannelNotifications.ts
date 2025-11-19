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

      // Fetch user phone numbers and email preferences from profiles
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, phone_number, email')
        .in('user_id', targetUsers);

      // Fetch notification preferences (email/push only, SMS is auto-enabled if phone exists)
      const { data: preferences } = await supabase
        .from('gw_notification_preferences')
        .select('user_id, push_enabled, email_enabled')
        .in('user_id', targetUsers);

      if (!profiles || profiles.length === 0) {
        console.warn('No user profiles found, skipping notifications');
        return {
          success: false,
          results: { push: 0, email: 0, sms: 0, errors: ['No user profiles found'] },
        };
      }

      const results = {
        push: 0,
        email: 0,
        sms: 0,
        errors: [] as string[],
      };

      // Create a map of user preferences
      const prefMap = new Map(preferences?.map(p => [p.user_id, p]) || []);

      // Send push notifications
      const pushUsers = profiles.filter(p => {
        const pref = prefMap.get(p.user_id);
        return pref?.push_enabled !== false; // Default to true if no preference
      });

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

      // Send SMS notifications - auto-enabled if user has phone number
      const smsUsers = profiles.filter(p => p.phone_number && p.phone_number.trim() !== '');
      
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
      const emailUsers = profiles.filter(p => {
        const pref = prefMap.get(p.user_id);
        return p.email && (pref?.email_enabled !== false); // Default to true if no preference
      });

      if (emailUsers.length > 0) {
        try {
          const { error } = await supabase.functions.invoke('gw-send-email', {
            body: {
              to: emailUsers.map(p => p.email).filter(Boolean),
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
