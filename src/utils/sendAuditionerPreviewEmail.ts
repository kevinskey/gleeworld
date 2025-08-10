import { supabase } from '@/integrations/supabase/client';

// Preview sender for Auditioner email
export async function gwSendAuditionPreview(force = false) {
  if (typeof window === 'undefined') return;
  const FLAG = 'gw-audition-preview-sent-v2';
  if (!force && sessionStorage.getItem(FLAG)) return;

  try {
    const origin = window.location.origin;
    const auditionerLink = `${origin}/dashboard/auditioner`;

    const subject = 'Spelman College Glee Club Audition – Song Preparation';

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif; color:#111; line-height:1.6;">
        <p>Dear Auditioner,</p>
        <p>Thank you for registering to audition for the Spelman College Glee Club! We are excited to hear your voice and meet you in person.</p>
        <p><strong>Your audition is scheduled for:</strong><br/>[Audition details will appear here]</p>
        <p><strong>Before your audition:</strong><br/>
           Please prepare the song “Come Thou Fount.” Your Auditioner page includes the music PDF and practice materials.</p>
        <p>
          <a href="${auditionerLink}" style="display:inline-block; padding:12px 18px; background:#1a2b6d; color:#fff; text-decoration:none; border-radius:6px;">
            Open Your Auditioner Page
          </a>
        </p>
        <p>If you have any questions, feel free to reply to this email.</p>
        <p>We look forward to an inspiring audition season!</p>
        <p>Musically yours,<br/>Ariana<br/>Student Conductor, Spelman College Glee Club</p>
      </div>
    `;

    const text = `Dear Auditioner,\n\nThank you for registering to audition for the Spelman College Glee Club! We are excited to hear your voice and meet you in person.\n\nYour audition is scheduled for:\n[Audition details will appear here]\n\nBefore your audition:\nPlease prepare the song “Come Thou Fount.” Your Auditioner page includes the music PDF and practice materials:\n${auditionerLink}\n\nIf you have any questions, reply to this email.\n\nMusically yours,\nAriana\nStudent Conductor, Spelman College Glee Club`;

    console.log('📧 Invoking gw-send-email edge function...');
    const { data, error } = await supabase.functions.invoke('gw-send-email', {
      body: {
        to: 'kpj64110@gmail.com',
        subject,
        html,
        text,
        from: 'Spelman Glee Club <onboarding@resend.dev>'
      }
    });

    if (error) {
      console.error('❌ Preview email send failed:', error);
    } else {
      console.log('✅ Preview email sent:', data);
      sessionStorage.setItem(FLAG, '1');
    }
  } catch (err) {
    console.error('❌ Unexpected error sending preview email:', err);
  }
}

// Expose for manual trigger only (no auto-send)
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.gwSendAuditionPreview = gwSendAuditionPreview;
}


