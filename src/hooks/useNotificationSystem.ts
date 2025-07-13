import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateNotificationParams {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  related_contract_id?: string;
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
          is_read: false, // Always start as unread
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        throw notificationError;
      }

      // Get user's phone number from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone_number, full_name')
        .eq('id', params.user_id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Don't throw here - notification was created successfully
        return notification;
      }

      // If user has a phone number, send SMS
      if (profile?.phone_number) {
        try {
          const smsMessage = `🔔 New notification: ${params.title}. Check the app to view details.`;
          
          const { error: smsError } = await supabase.functions.invoke('gw-send-sms', {
            body: {
              to: profile.phone_number,
              message: smsMessage
            }
          });

          if (smsError) {
            console.error('Error sending SMS:', smsError);
            // Don't throw here - notification was created successfully
          } else {
            console.log('SMS sent successfully for notification:', notification.id);
          }
        } catch (smsError) {
          console.error('Error in SMS sending process:', smsError);
          // Don't throw here - notification was created successfully
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