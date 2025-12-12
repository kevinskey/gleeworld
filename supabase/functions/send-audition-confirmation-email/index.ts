import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditionConfirmationRequest {
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  auditionDate: string;
  auditionTime: string;
  auditionLocation?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const resend = new Resend(resendApiKey);
    const { applicationId, applicantName, applicantEmail, auditionDate, auditionTime, auditionLocation }: AuditionConfirmationRequest = await req.json();

    console.log('🎭 Sending audition confirmation email to:', applicantEmail);

    const formattedDate = new Date(auditionDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const location = auditionLocation || 'Spelman College Music Department';
    const dashboardUrl = `${Deno.env.get('SITE_URL') || 'https://gleeworld.org'}/auditioner-dashboard`;

    const emailResponse = await resend.emails.send({
      from: 'Spelman Glee Club <auditions@gleeworld.org>',
      to: [applicantEmail],
      subject: 'Audition Confirmation - Spelman College Glee Club',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Audition Confirmation</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #8B5CF6; }
            .logo { width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #8B5CF6, #A855F7); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .logo span { color: white; font-size: 32px; font-weight: bold; }
            h1 { color: #8B5CF6; margin: 0; font-size: 28px; }
            .subtitle { color: #666; font-size: 16px; margin: 5px 0 0; }
            .content { margin: 30px 0; }
            .highlight-box { background: linear-gradient(135deg, #8B5CF6, #A855F7); color: white; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: 600; color: #555; }
            .detail-value { color: #333; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #A855F7); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; text-align: center; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">
                <span>♪</span>
              </div>
              <h1>Audition Confirmed!</h1>
              <p class="subtitle">Spelman College Glee Club</p>
            </div>
            
            <div class="content">
              <p>Dear ${applicantName},</p>
              
              <p>🎵 Thank you for applying to audition for the prestigious Spelman College Glee Club! We're thrilled to confirm your audition details.</p>
              
              <div class="highlight-box">
                <h2 style="margin: 0 0 15px; font-size: 24px;">Your Audition Details</h2>
                <div class="detail-row" style="border: none; justify-content: center; flex-direction: column;">
                  <div class="detail-label" style="color: white; margin-bottom: 10px;">Date & Time</div>
                  <div class="detail-value" style="color: white; font-size: 18px; font-weight: bold;">${formattedDate} at ${auditionTime}</div>
                </div>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${location}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Application ID:</span>
                <span class="detail-value">${applicationId}</span>
              </div>
              
              <p><strong>What to Bring:</strong></p>
              <ul>
                <li>Your prepared audition piece (sheet music provided in dashboard)</li>
                <li>A positive attitude and your beautiful voice!</li>
                <li>Please arrive 15 minutes early</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="cta-button">View Your Auditioner Dashboard</a>
              </div>
              
              <p>We're excited to hear you sing and learn more about your musical journey. The Glee Club community is looking forward to meeting you!</p>
              
              <p><strong>Break a leg! 🌟</strong></p>
              
              <p>Best regards,<br>
              <strong>The Spelman College Glee Club</strong><br>
              <em>"To Amaze and Inspire"</em></p>
            </div>
            
            <div class="footer">
              <p>Questions? Contact us at <a href="mailto:auditions@gleeworld.org">auditions@gleeworld.org</a></p>
              <p>© 2025 Spelman College Glee Club. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    console.log('✅ Audition confirmation email sent successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Audition confirmation sent to ${applicantEmail}`,
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('❌ Error sending audition confirmation email:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to send audition confirmation email' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
};

serve(handler);