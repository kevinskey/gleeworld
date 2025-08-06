import { supabase } from '@/integrations/supabase/client';

export const sendAuditionConfirmation = async () => {
  try {
    console.log('🎭 Sending audition confirmation...');
    
    // Mya's confirmation message
    const myaMessage = `Hi Mya! 🎵 Thank you for signing up for the Spelman College Glee Club audition! Your audition is confirmed for August 15, 2025 at 3:30 PM. We're excited to hear you sing! Please arrive 15 minutes early. Break a leg! 🌟 - Spelman Glee Club`;
    
    // Admin notification message
    const adminMessage = `SMS COPY: Sent to Mya Jones (443) 688-3051: "${myaMessage}"`;

    // Send SMS to Mya
    const myaResponse = await supabase.functions.invoke('send-sms', {
      body: {
        to: '(443) 688-3051',
        message: myaMessage
      }
    });

    if (myaResponse.error) {
      console.error('Failed to send SMS to Mya:', myaResponse.error);
      throw myaResponse.error;
    }

    console.log('✅ SMS sent to Mya successfully:', myaResponse.data);

    // Send copy to admin
    const adminResponse = await supabase.functions.invoke('send-sms', {
      body: {
        to: '(470) 622-1392',
        message: adminMessage
      }
    });

    if (adminResponse.error) {
      console.error('Failed to send copy to admin:', adminResponse.error);
      throw adminResponse.error;
    }

    console.log('✅ Copy sent to admin successfully:', adminResponse.data);

    return {
      success: true,
      myaMessageId: myaResponse.data?.messageId,
      adminMessageId: adminResponse.data?.messageId
    };

  } catch (error: any) {
    console.error('❌ Error sending audition confirmation:', error);
    throw error;
  }
};

// Auto-execute the function
sendAuditionConfirmation().then(() => {
  console.log('🎉 Audition confirmation process completed!');
}).catch((error) => {
  console.error('💥 Audition confirmation failed:', error);
});