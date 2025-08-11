import React, { useEffect } from 'react';
import { sendTestAuditionEmail } from '../utils/sendAuditionerPreviewEmail';

export const TestEmailSender = () => {
  useEffect(() => {
    // Send test email on component mount
    const sendEmail = async () => {
      try {
        console.log('🚀 Sending test audition email...');
        const result = await sendTestAuditionEmail();
        console.log('✅ Test email sent successfully:', result);
      } catch (error) {
        console.error('❌ Test email failed:', error);
      }
    };

    sendEmail();
  }, []);

  return null;
};

export default TestEmailSender;