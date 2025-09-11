import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SMSNotificationData {
  groupId: string;
  message: string;
  senderName: string;
  phoneNumbers?: string[];
}

export const useSendSMSNotification = () => {
  return useMutation({
    mutationFn: async (data: SMSNotificationData) => {
      console.log('🔄 Sending SMS notification:', data);
      
      const { data: result, error } = await supabase.functions.invoke('send-sms-notification', {
        body: data
      });

      console.log('📱 SMS Function Response:', { result, error });
      
      if (error) {
        console.error('❌ SMS Function Error:', error);
        throw error;
      }
      
      return result;
    },
    onSuccess: (result) => {
      if (result.totalSent > 0) {
        toast.success(`SMS notifications sent to ${result.totalSent} members`);
      }
      if (result.totalFailed > 0) {
        toast.warning(`Failed to send ${result.totalFailed} SMS notifications`);
      }
    },
    onError: (error: any) => {
      console.error('SMS notification error:', error);
      toast.error('Failed to send SMS notifications');
    }
  });
};

// Hook to check if SMS integration is enabled for a group
export const useGroupSMSSettings = (groupId: string) => {
  return {
    // This could be extended to check group-specific SMS settings
    // For now, we'll assume SMS is enabled for all groups
    smsEnabled: true,
    shouldNotify: (messageType: string) => {
      // Only send SMS for text messages, not system messages
      return messageType === 'text';
    }
  };
};

// Utility function to format message for SMS
export const formatMessageForSMS = (
  groupName: string,
  senderName: string,
  content: string,
  maxLength: number = 160
): string => {
  const prefix = `${groupName}: ${senderName}: `;
  const availableLength = maxLength - prefix.length;
  
  if (content.length <= availableLength) {
    return prefix + content;
  }
  
  return prefix + content.substring(0, availableLength - 3) + '...';
};