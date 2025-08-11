import { supabase } from '@/integrations/supabase/client';

interface AuditionConfirmationData {
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  auditionDate: string;
  auditionTime: string;
  auditionLocation?: string;
}

export const sendAuditionConfirmationEmail = async (data: AuditionConfirmationData) => {
  try {
    console.log('🎭 Sending audition confirmation email to:', data.applicantEmail);
    
    const { data: response, error } = await supabase.functions.invoke('send-audition-confirmation-email', {
      body: data
    });

    if (error) {
      console.error('Failed to send audition confirmation email:', error);
      throw error;
    }

    console.log('✅ Audition confirmation email sent successfully:', response);
    return response;

  } catch (error: any) {
    console.error('❌ Error sending audition confirmation email:', error);
    throw error;
  }
};