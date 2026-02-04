import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  requestId: string;
  email: string;
  fullName: string;
  requestedRole: 'fan' | 'alumna';
  graduationYear?: number;
  voicePart?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { requestId, email, fullName, requestedRole, graduationYear, voicePart }: NotificationRequest = await req.json();

    console.log("Registration notification request:", { requestId, email, fullName, requestedRole });

    // Get webmaster email(s) from settings or use default
    const { data: settingsData } = await supabaseClient
      .from('gw_system_settings')
      .select('value')
      .eq('key', 'webmaster_email')
      .single();

    const webmasterEmail = settingsData?.value || "webmaster@gleeworld.org";
    
    // Also get admin users who should receive notifications
    const { data: adminUsers } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'super-admin'])
      .eq('is_active', true);

    let adminEmails: string[] = [];
    if (adminUsers && adminUsers.length > 0) {
      const { data: profiles } = await supabaseClient
        .from('gw_profiles')
        .select('email')
        .in('user_id', adminUsers.map(u => u.user_id));
      
      adminEmails = profiles?.map(p => p.email).filter(Boolean) || [];
    }

    const allRecipients = [webmasterEmail, ...adminEmails].filter((v, i, a) => a.indexOf(v) === i);

    const roleDisplay = requestedRole === 'fan' ? 'Fan/Supporter' : 'Alumna';
    const roleEmoji = requestedRole === 'fan' ? '💖' : '🎓';
    const adminPanelUrl = `https://gleeworld.org/admin/alumnae`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0066CC;">
          <h1 style="color: #0066CC; margin: 0; font-size: 24px;">
            ${roleEmoji} New GleeWorld Registration Request
          </h1>
        </div>
        
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hello Webmaster,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            A new user has registered on GleeWorld and is awaiting your approval:
          </p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 140px;">Name:</td>
                <td style="padding: 8px 0; font-weight: 600;">${fullName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Email:</td>
                <td style="padding: 8px 0;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Requested Role:</td>
                <td style="padding: 8px 0;">
                  <span style="background: ${requestedRole === 'fan' ? '#ec4899' : '#8b5cf6'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                    ${roleDisplay}
                  </span>
                </td>
              </tr>
              ${graduationYear ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Graduation Year:</td>
                <td style="padding: 8px 0; font-weight: 600;">${graduationYear}</td>
              </tr>
              ` : ''}
              ${voicePart ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Voice Part:</td>
                <td style="padding: 8px 0;">${voicePart}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #666;">Submitted:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleString('en-US', { 
                  dateStyle: 'full', 
                  timeStyle: 'short',
                  timeZone: 'America/New_York'
                })} ET</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 16px; margin: 25px 0;">
            Please review this request in the Admin Dashboard:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminPanelUrl}" 
               style="display: inline-block; background: #0066CC; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Review Registration Request
            </a>
          </div>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">
            This is an automated message from GleeWorld.org<br>
            Spelman College Glee Club
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "GleeWorld <noreply@gleeworld.org>",
      to: allRecipients,
      subject: `New GleeWorld Registration Request: ${roleDisplay} - ${fullName}`,
      html: emailHtml,
    });

    console.log("Notification email sent:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Notification sent to webmaster(s)",
      recipientCount: allRecipients.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in gw-registration-notification:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to send notification",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
