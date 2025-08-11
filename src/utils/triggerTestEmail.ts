// Trigger test email immediately
import { sendTestAuditionEmail } from './sendAuditionerPreviewEmail';

// Auto-trigger on import
if (typeof window !== 'undefined') {
  setTimeout(() => {
    sendTestAuditionEmail()
      .then((result) => {
        console.log('✅ Test email sent successfully:', result);
      })
      .catch((error) => {
        console.error('❌ Test email failed:', error);
      });
  }, 1000);
}

export {};