import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { getOrgName } from "../_shared/branding.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DecisionRequest {
  requestId: string;
  action: 'approve' | 'deny';
  adminNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get admin user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: No auth header');
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const orgName = await getOrgName(supabaseClient);

    // Verify admin user
    const supabaseUserClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized: Invalid user');
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super-admin'])
      .eq('is_active', true)
      .single();

    if (!roleData) {
      throw new Error('Unauthorized: User is not an admin');
    }

    const { requestId, action, adminNotes }: DecisionRequest = await req.json();

    console.log("Processing registration decision:", { requestId, action, adminId: user.id });

    // Get the registration request
    const { data: request, error: requestError } = await supabaseClient
      .from('registration_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      throw new Error('Registration request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('This request has already been processed');
    }

    // Update the registration request
    const { error: updateError } = await supabaseClient
      .from('registration_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'denied',
        admin_notes: adminNotes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      throw new Error(`Failed to update request: ${updateError.message}`);
    }

    // If approved, update user profile and add role
    if (action === 'approve') {
      // Update gw_profiles
      const { error: profileError } = await supabaseClient
        .from('gw_profiles')
        .update({
          role: request.requested_role,
          verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', request.user_id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Add to user_roles table
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .upsert({
          user_id: request.user_id,
          role: request.requested_role,
          is_active: true,
          granted_by: user.id,
          granted_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,role'
        });

      if (roleError) {
        console.error('Error adding user role:', roleError);
      }
    }

    // Send confirmation email to user
    const loginUrl = 'https://gleeworld.org/auth';
    const portalUrl = request.requested_role === 'alumna' 
      ? 'https://gleeworld.org/alumnae' 
      : 'https://gleeworld.org/fan';
    
    const roleDisplay = request.requested_role === 'fan' ? 'Fan/Supporter' : 'Alumna';

    let emailHtml: string;
    let emailSubject: string;

    if (action === 'approve') {
      emailSubject = `Welcome to GleeWorld - Your ${roleDisplay} Account is Approved! 🎉`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0066CC;">
            <h1 style="color: #0066CC; margin: 0; font-size: 28px;">
              🎉 Welcome to GleeWorld!
            </h1>
          </div>
          
          <div style="padding: 30px 0;">
            <p style="font-size: 18px; margin-bottom: 20px;">Dear ${request.full_name},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px; color: #059669; font-weight: 600;">
              Great news! Your GleeWorld ${roleDisplay} registration has been approved.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              You can now log in and access all the features available to ${roleDisplay === 'Alumna' ? 'alumnae' : 'fans and supporters'}:
            </p>
            
            <ul style="background: #f0f9ff; border-radius: 8px; padding: 20px 20px 20px 40px; margin: 20px 0;">
              ${request.requested_role === 'alumna' ? `
                <li style="margin-bottom: 10px;">Access alumnae-only events and reunions</li>
                <li style="margin-bottom: 10px;">Connect with Glee Club sisters through the directory</li>
                <li style="margin-bottom: 10px;">Share your memories on the Memory Wall</li>
                <li style="margin-bottom: 10px;">Participate in mentorship programs</li>
              ` : `
                <li style="margin-bottom: 10px;">Get exclusive concert announcements</li>
                <li style="margin-bottom: 10px;">Access behind-the-scenes content</li>
                <li style="margin-bottom: 10px;">Join the community forum</li>
                <li style="margin-bottom: 10px;">Receive special fan updates</li>
              `}
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background: #0066CC; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 10px;">
                Log In Now
              </a>
            </div>
            
            <p style="font-size: 16px; margin-top: 30px;">
              Welcome to the family! 🎵
            </p>
            
            <p style="font-size: 16px; margin-top: 10px;">
              The GleeWorld Team<br>
              <em>${orgName}</em>
            </p>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">
              GleeWorld.org | ${orgName}<br>
              "To Amaze and Inspire"
            </p>
          </div>
        </body>
        </html>
      `;
    } else {
      emailSubject = "GleeWorld Registration Update";
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0066CC;">
            <h1 style="color: #0066CC; margin: 0; font-size: 24px;">
              GleeWorld Registration Update
            </h1>
          </div>
          
          <div style="padding: 30px 0;">
            <p style="font-size: 18px; margin-bottom: 20px;">Dear ${request.full_name},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Thank you for your interest in joining GleeWorld.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Unfortunately, we were unable to approve your ${roleDisplay} registration at this time.
            </p>
            
            ${adminNotes ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>Note from our team:</strong><br>
                ${adminNotes}
              </p>
            </div>
            ` : ''}
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              If you have any questions or believe this was made in error, please contact us at 
              <a href="mailto:webmaster@gleeworld.org" style="color: #0066CC;">webmaster@gleeworld.org</a>.
            </p>
            
            <p style="font-size: 16px; margin-top: 30px;">
              Best regards,<br>
              The GleeWorld Team<br>
              <em>${orgName}</em>
            </p>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">
              GleeWorld.org | ${orgName}
            </p>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "GleeWorld <noreply@gleeworld.org>",
      to: [request.email],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Confirmation email sent:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: `Registration ${action === 'approve' ? 'approved' : 'denied'} successfully`,
      action,
      userId: request.user_id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in gw-registration-decision:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to process decision",
    }), {
      status: error.message?.includes('Unauthorized') ? 401 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
