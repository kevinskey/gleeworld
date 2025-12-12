import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyPreEventExcuseRequest {
  student_id: string;
  student_name: string;
  student_email: string;
  event_id: string;
  event_title: string;
  event_date: string;
  reason: string;
  documentation_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      student_id,
      student_name,
      student_email,
      event_id,
      event_title,
      event_date,
      reason,
      documentation_url
    }: NotifyPreEventExcuseRequest = await req.json();

    console.log("Processing pre-event excuse notification:", {
      student_name,
      event_title,
      event_date
    });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find secretaries - check exec_board_role, role_tags, and special_roles
    const { data: secretaries, error: secretariesError } = await supabase
      .from('gw_profiles')
      .select('user_id, email, full_name, phone')
      .or(`exec_board_role.ilike.%secretary%,role_tags.cs.{secretary},special_roles.cs.{secretary}`);

    if (secretariesError) {
      console.error('Error finding secretaries:', secretariesError);
    }

    // If no secretaries found, fall back to super admins
    let notificationTargets = secretaries || [];
    
    if (notificationTargets.length === 0) {
      console.log('No secretaries found, falling back to super admins');
      const { data: superAdmins, error: superAdminsError } = await supabase
        .from('gw_profiles')
        .select('user_id, email, full_name, phone')
        .eq('is_super_admin', true);

      if (superAdminsError) {
        console.error('Error finding super admins:', superAdminsError);
        throw new Error('Could not find notification targets');
      }

      notificationTargets = superAdmins || [];
    }

    if (notificationTargets.length === 0) {
      throw new Error('No notification targets found (no secretaries or super admins)');
    }

    console.log(`Found ${notificationTargets.length} notification targets`);

    // Format event date for display
    const eventDateFormatted = new Date(event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Notification content
    const notificationTitle = `Pre-Event Excuse: ${student_name}`;
    const notificationMessage = `${student_name} has submitted a pre-event excuse for "${event_title}" on ${eventDateFormatted}. Reason: ${reason}`;

    // Create HTML email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pre-Event Excuse Request</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .detail-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .reason-box { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 15px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            h1 { margin: 0; font-size: 24px; }
            h2 { color: #667eea; margin-top: 0; }
            .student-info { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
            .student-info > div { flex: 1; min-width: 200px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎵 GleeWorld</h1>
              <p>Pre-Event Excuse Request</p>
            </div>
            
            <div class="content">
              <h2>New Excuse Request Submitted</h2>
              
              <div class="detail-box">
                <h3>Student Information</h3>
                <div class="student-info">
                  <div><strong>Name:</strong> ${student_name}</div>
                  <div><strong>Email:</strong> ${student_email}</div>
                </div>
              </div>

              <div class="detail-box">
                <h3>Event Information</h3>
                <div><strong>Event:</strong> ${event_title}</div>
                <div><strong>Date & Time:</strong> ${eventDateFormatted}</div>
              </div>

              <div class="reason-box">
                <h3>Reason for Absence</h3>
                <p>${reason}</p>
              </div>

              ${documentation_url ? `
                <div class="detail-box">
                  <h3>Supporting Documentation</h3>
                  <a href="${documentation_url}" class="button" target="_blank">📄 View Document</a>
                </div>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <p><em>Please review this request and take appropriate action.</em></p>
              </div>
            </div>

            <div class="footer">
              <p>This is an automated notification from GleeWorld Attendance System</p>
              <p>Please do not reply directly to this email</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send notifications to all targets
    const notificationResults = await Promise.allSettled(
      notificationTargets.map(async (target) => {
        const results = {
          target: target.full_name || target.email,
          inApp: false,
          email: false,
          sms: false
        };

        // 1. Create in-app notification
        if (target.user_id) {
          try {
            const { error: inAppError } = await supabase
              .from('user_notifications')
              .insert([{
                user_id: target.user_id,
                title: notificationTitle,
                message: notificationMessage,
                type: 'pre_event_excuse',
                created_by: student_id
              }]);

            if (!inAppError) {
              results.inApp = true;
              console.log(`In-app notification sent to ${target.full_name}`);
            } else {
              console.error(`In-app notification failed for ${target.full_name}:`, inAppError);
            }
          } catch (error) {
            console.error(`In-app notification error for ${target.full_name}:`, error);
          }
        }

        // 2. Send email notification
        if (target.email) {
          try {
            const { error: emailError } = await supabase.functions.invoke('gw-send-email', {
              body: {
                to: target.email,
                subject: `🎵 Pre-Event Excuse Request - ${student_name}`,
                html: emailHtml,
                from: "GleeWorld <noreply@gleeworld.org>",
                replyTo: student_email
              }
            });

            if (!emailError) {
              results.email = true;
              console.log(`Email sent to ${target.email}`);
            } else {
              console.error(`Email failed for ${target.email}:`, emailError);
            }
          } catch (error) {
            console.error(`Email error for ${target.email}:`, error);
          }
        }

        // 3. Send SMS notification (if phone number available)
        if (target.phone) {
          try {
            const smsMessage = `🎵 GleeWorld: ${student_name} submitted a pre-event excuse for "${event_title}" on ${new Date(event_date).toLocaleDateString()}. Check your email for details.`;
            
            const { error: smsError } = await supabase.functions.invoke('gw-send-sms', {
              body: {
                to: target.phone,
                message: smsMessage
              }
            });

            if (!smsError) {
              results.sms = true;
              console.log(`SMS sent to ${target.phone}`);
            } else {
              console.error(`SMS failed for ${target.phone}:`, smsError);
            }
          } catch (error) {
            console.error(`SMS error for ${target.phone}:`, error);
          }
        }

        return results;
      })
    );

    // Compile results
    const successfulNotifications = notificationResults
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    const failedNotifications = notificationResults
      .filter(result => result.status === 'rejected')
      .map(result => result.reason);

    console.log('Notification results:', {
      successful: successfulNotifications,
      failed: failedNotifications
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Pre-event excuse notifications sent successfully",
      notified_count: notificationTargets.length,
      notification_results: successfulNotifications
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in notify-pre-event-excuse function:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to send pre-event excuse notifications",
      details: error.toString()
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);