
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateNotificationParams {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  related_contract_id?: string;
  sendSMS?: boolean;
  sendEmail?: boolean;
}

export const useNotificationSystem = () => {
  const { toast } = useToast();

  const createNotificationWithSMS = async (params: CreateNotificationParams) => {
    try {
      // First, create the notification in the database
      const { data: notification, error: notificationError } = await supabase
        .from('gw_notifications')
        .insert([{
          user_id: params.user_id,
          title: params.title,
          message: params.message,
          type: params.type || 'info',
          category: 'general',
          metadata: params.related_contract_id ? { contract_id: params.related_contract_id } : {},
          priority: 0
        }])
        .select()
        .single();

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        throw notificationError;
      }

      // Get user's notification preferences and profile
      const { data: preferences, error: preferencesError } = await supabase
        .from('gw_notification_preferences')
        .select('*')
        .eq('user_id', params.user_id)
        .single();

      if (preferencesError) {
        console.error('Error fetching preferences:', preferencesError);
        // Continue without preferences - default to no SMS
      }

      // Get user's profile for phone number and email
      const { data: profile, error: profileError } = await supabase
        .from('gw_profiles')
        .select('phone_number, full_name, email')
        .eq('user_id', params.user_id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Continue without profile - no SMS will be sent
      }

      // Create delivery log for SMS if requested
      if (params.sendSMS || preferences?.sms_enabled) {
        const { error: deliveryLogError } = await supabase
          .from('gw_notification_delivery_log')
          .insert({
            notification_id: notification.id,
            user_id: params.user_id,
            delivery_method: 'sms',
            status: 'pending'
          });

        if (deliveryLogError) {
          console.error('Error creating SMS delivery log:', deliveryLogError);
        }
      }

      // Send SMS if enabled and phone number available
      if (
        (params.sendSMS || preferences?.sms_enabled) &&
        (profile?.phone_number || preferences?.phone_number)
      ) {
        const phoneNumber = profile?.phone_number || preferences?.phone_number;
        
        try {
          const smsMessage = `🔔 New notification: ${params.title}. Check the app to view details.`;
          
          const { data: smsData, error: smsError } = await supabase.functions.invoke('gw-send-sms', {
            body: {
              to: phoneNumber,
              message: smsMessage,
              notificationId: notification.id
            }
          });

          if (smsError) {
            console.error('Error sending SMS:', smsError);
            // Update delivery log with error
            await supabase
              .from('gw_notification_delivery_log')
              .update({
                status: 'failed',
                error_message: smsError.message
              })
              .eq('notification_id', notification.id)
              .eq('delivery_method', 'sms');
          } else if (smsData?.success) {
            console.log('SMS sent successfully for notification:', notification.id);
            // Update delivery log with success
            await supabase
              .from('gw_notification_delivery_log')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                external_id: smsData.sid
              })
              .eq('notification_id', notification.id)
              .eq('delivery_method', 'sms');
          }
        } catch (smsError) {
          console.error('Error in SMS sending process:', smsError);
          // Update delivery log with error
          await supabase
            .from('gw_notification_delivery_log')
            .update({
              status: 'failed',
              error_message: 'SMS sending failed'
            })
            .eq('notification_id', notification.id)
            .eq('delivery_method', 'sms');
        }
      }

      // Send email if enabled
      if (params.sendEmail || preferences?.email_enabled) {
        try {
          const { error: emailError } = await supabase.functions.invoke('gw-send-email', {
            body: {
              to: profile?.email || (await supabase.auth.getUser()).data.user?.email,
              subject: params.title,
              message: params.message,
              notificationId: notification.id
            }
          });

          if (emailError) {
            console.error('Error sending email:', emailError);
          } else {
            console.log('Email sent successfully for notification:', notification.id);
          }
        } catch (emailError) {
          console.error('Error in email sending process:', emailError);
        }
      }

      return notification;
    } catch (error) {
      console.error('Error in createNotificationWithSMS:', error);
      toast({
        title: "Error",
        description: "Failed to create notification",
        variant: "destructive",
      });
      throw error;
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('gw_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    createNotificationWithSMS,
    markNotificationAsRead
  };
};
