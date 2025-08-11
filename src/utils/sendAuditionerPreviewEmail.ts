import { supabase } from '@/integrations/supabase/client';

// Proper audition email sender with real user data
export async function sendAuditionEmail(userData: {
  firstName: string;
  lastName: string;
  email: string;
  auditionDate?: string;
  auditionTime?: string;
  auditionLocation?: string;
}) {
  if (typeof window === 'undefined') return;

  try {
    const origin = window.location.origin;
    const auditionerLink = `${origin}/dashboard/auditioner`;
    const logoUrl = `${origin}/images/glee-logo-email.png`;

    const subject = `Spelman College Glee Club Audition – Welcome ${userData.firstName}!`;

    // Format audition details
    let auditionDetails = 'Your audition details will be confirmed soon.';
    if (userData.auditionDate && userData.auditionTime) {
      const auditionDateTime = new Date(`${userData.auditionDate}T${userData.auditionTime}`);
      const formattedDate = auditionDateTime.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const formattedTime = auditionDateTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      auditionDetails = `${formattedDate} at ${formattedTime}`;
      if (userData.auditionLocation) {
        auditionDetails += `<br/>Location: ${userData.auditionLocation}`;
      }
    }

    const html = `
      <div style="background:#f5f7fb;padding:24px;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e9f2;">
          <div style="background:#1E4AA9;padding:20px;text-align:center;">
            <img src="${logoUrl}" alt="Spelman College Glee Club" style="height:40px;display:inline-block;" />
          </div>
          <div style="padding:24px;color:#111;font-family:Arial,Helvetica,sans-serif;">
            <p>Dear ${userData.firstName},</p>
            <p>Thank you for registering to audition for the Spelman College Glee Club! We are excited to hear your voice and meet you in person.</p>
            <p><strong>Your audition is scheduled for:</strong><br/>${auditionDetails}</p>
            <p><strong>Before your audition:</strong><br/>
               Please prepare the song "Come Thou Fount." Your Auditioner page includes the music PDF and practice materials.</p>
            <p style="margin:24px 0;">
              <a href="${auditionerLink}" style="display:inline-block; padding:12px 18px; background:#1E4AA9; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;">
                Open Your Auditioner Page
              </a>
            </p>
            <p>If you have any questions, feel free to reply to this email.</p>
            <p>We look forward to an inspiring audition season!</p>
            <p>Musically yours,<br/>Ariana<br/>Student Conductor, Spelman College Glee Club</p>
          </div>
          <div style="padding:12px 24px;color:#6b7280;font-size:12px;text-align:center;background:#f9fafb;">
            © Spelman College Glee Club • GleeWorld.org
          </div>
        </div>
      </div>
    `;

    const text = `Dear ${userData.firstName},

Thank you for registering to audition for the Spelman College Glee Club! We are excited to hear your voice and meet you in person.

Your audition is scheduled for:
${auditionDetails.replace(/<br\/>/g, '\n')}

Before your audition:
Please prepare the song "Come Thou Fount." Your Auditioner page includes the music PDF and practice materials:
${auditionerLink}

If you have any questions, reply to this email.

Musically yours,
Ariana
Student Conductor, Spelman College Glee Club`;

    console.log('📧 Sending personalized audition email...');
    const { data, error } = await supabase.functions.invoke('gw-send-email', {
      body: {
        to: userData.email,
        subject,
        html,
        text,
        from: 'Spelman Glee Club <onboarding@resend.dev>'
      }
    });

    if (error) {
      console.error('❌ Audition email send failed:', error);
      throw error;
    } else {
      console.log('✅ Audition email sent:', data);
      return { success: true, data };
    }
  } catch (err) {
    console.error('❌ Unexpected error sending audition email:', err);
    throw err;
  }
}

// Legacy function (disabled to prevent spam)
export async function gwSendAuditionPreview(force = false) {
  console.log('📧 Legacy preview function - now redirects to proper sendAuditionEmail');
  // This is now disabled to prevent spam
  return { success: false, message: 'Use sendAuditionEmail with proper user data instead' };
}

// Test function for sending example email
export async function sendTestAuditionEmail() {
  const testData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'kpj64110@gmail.com',
    auditionDate: '2025-01-20',
    auditionTime: '14:30',
    auditionLocation: 'Spelman College Music Hall'
  };
  
  return await sendAuditionEmail(testData);
}

// Expose test function for manual trigger
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.sendTestAuditionEmail = sendTestAuditionEmail;
  // @ts-ignore
  window.sendAuditionEmail = sendAuditionEmail;
}