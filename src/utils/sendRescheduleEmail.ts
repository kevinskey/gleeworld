import { supabase } from '@/integrations/supabase/client';

interface RescheduleEmailData {
  recipientEmail: string;
  recipientName: string;
  currentDate: string;
  currentTime: string;
  copyEmail?: string;
}

export const sendRescheduleEmail = async (data: RescheduleEmailData) => {
  try {
    console.log('🎭 Sending reschedule email to:', data.recipientEmail);
    
    const { data: response, error } = await supabase.functions.invoke('send-audition-reschedule-email', {
      body: data
    });

    if (error) {
      console.error('Failed to send reschedule email:', error);
      throw error;
    }

    console.log('✅ Reschedule email sent successfully:', response);
    return response;

  } catch (error: any) {
    console.error('❌ Error sending reschedule email:', error);
    throw error;
  }
};