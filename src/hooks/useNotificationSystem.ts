
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
        .from('user_notifications')
        .insert([{
          user_id: params.user_id,
          title: params.title,
          message: params.message,
          type: params.type || 'info',
          related_contract_id: params.related_contract_id,
          is_read: false,
          created_by: (await supabase.auth.getUser()).data.user?.id
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
        .from('profiles')
        .select('phone_number, full_name, email')
        .eq('id', params.user_id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Continue without profile - no SMS will be sent
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
          } else if (smsData?.success) {
            console.log('SMS sent successfully for notification:', notification.id);
          }
        } catch (smsError) {
          console.error('Error in SMS sending process:', smsError);
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
        .from('user_notifications')
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
