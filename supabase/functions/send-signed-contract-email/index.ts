import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getOrgName } from "../_shared/branding.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentEmail, studentName, pdfStoragePath } = await req.json();

    if (!studentEmail || !studentName || !pdfStoragePath) {
      throw new Error('Missing required fields: studentEmail, studentName, pdfStoragePath');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const orgName = await getOrgName(supabase);

    // Download the signed PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('user-files')
      .download(pdfStoragePath);

    if (downloadError) {
      console.error('Error downloading PDF:', downloadError);
      throw new Error('Failed to download signed contract PDF');
    }

    // Convert to base64 for email attachment (chunked to avoid stack overflow)
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    const base64Pdf = btoa(binary);

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GleeWorld <noreply@gleeworld.org>',
        to: [studentEmail],
        subject: 'Your Signed Tour Participation Contract',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #003366; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${orgName}</h1>
              <p style="color: #87CEEB; margin: 5px 0 0 0; font-size: 14px;">Spring Tour 2026</p>
            </div>
            <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="color: #374151; font-size: 16px;">Dear ${studentName},</p>
              <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                Thank you for signing the Tour Participation Contract & Code of Conduct for the 
                Spring Tour 2026. Your signed copy is attached to this email for your records.
              </p>
              <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                Please review the attached document and keep it for your records. If you have any 
                questions, please contact the Director.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated email from GleeWorld.org<br/>
                ${orgName} · "To Amaze and Inspire"
              </p>
            </div>
          </div>
        `,
        attachments: [{
          filename: `Tour_Contract_${studentName.replace(/\s+/g, '_')}.pdf`,
          content: base64Pdf,
        }],
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error sending signed contract email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
