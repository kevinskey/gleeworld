
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkW9EmailRequest {
  customMessage?: string;
  includeRoles?: string[];
  excludeCompleted?: boolean;
  reminderType?: 'initial' | 'reminder';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if Resend API key is available
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY environment variable is not set");
      throw new Error("Email service not configured");
    }
    console.log("Resend API key is available:", !!resendApiKey);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super-admin'].includes(profile.role)) {
      throw new Error("Admin access required");
    }

    const { 
      customMessage = '', 
      includeRoles = [], 
      excludeCompleted = true,
      reminderType = 'initial'
    }: BulkW9EmailRequest = await req.json();

    console.log('Bulk W9 email request:', { includeRoles, excludeCompleted, reminderType });

    // Build user query
    let userQuery = supabaseClient
      .from('profiles')
      .select('id, email, full_name, role');

    // Filter by roles if specified
    if (includeRoles.length > 0) {
      userQuery = userQuery.in('role', includeRoles);
    }

    const { data: users, error: usersError } = await userQuery;

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    let targetUsers = users || [];

    // Exclude users who already completed W9 forms if requested
    if (excludeCompleted) {
      const { data: completedW9s } = await supabaseClient
        .from('w9_forms')
        .select('user_id')
        .eq('status', 'submitted');

      const completedUserIds = new Set(completedW9s?.map(w9 => w9.user_id) || []);
      targetUsers = targetUsers.filter(user => !completedUserIds.has(user.id));
    }

    console.log(`Sending W9 emails to ${targetUsers.length} users`);

    const emailResults = [];
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://your-app.lovable.app';

    for (const targetUser of targetUsers) {
      try {
        const emailSubject = reminderType === 'reminder' 
          ? "Reminder: Complete Your W9 Tax Form" 
          : "Action Required: Complete Your W9 Tax Form";

        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">W9 Tax Form Required</h2>
            
            <p>Hello ${targetUser.full_name || targetUser.email},</p>
            
            ${reminderType === 'reminder' 
              ? '<p><strong>This is a reminder</strong> that you need to complete your W9 tax form.</p>'
              : '<p>You are required to complete your W9 tax form for our records.</p>'
            }
            
            ${customMessage ? `<div style="background: #f8fafc; padding: 15px; border-left: 4px solid #1e40af; margin: 20px 0;"><p>${customMessage}</p></div>` : ''}
            
            <div style="margin: 30px 0;">
              <a href="${appUrl}/w9-form" 
                 style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Complete W9 Form
              </a>
            </div>
            
            <p><strong>What is a W9 form?</strong><br>
            Form W-9 is used to request the taxpayer identification number (TIN) of a U.S. person and to request certain certifications and claims for exemption.</p>
            
            <p><strong>Why do I need to complete this?</strong><br>
            We are required by law to collect this information for tax reporting purposes if you receive payments from us.</p>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">
              This email was sent automatically. Please do not reply to this email.
            </p>
          </div>
        `;

        console.log(`Attempting to send email to ${targetUser.email}`);

        const emailResponse = await resend.emails.send({
          from: "Admin <onboarding@resend.dev>",
          to: [targetUser.email],
          subject: emailSubject,
          html: emailContent,
        });

        console.log(`Resend API response for ${targetUser.email}:`, JSON.stringify(emailResponse));

        if (emailResponse.error) {
          console.error(`Resend API error for ${targetUser.email}:`, emailResponse.error);
          emailResults.push({
            userId: targetUser.id,
            email: targetUser.email,
            success: false,
            error: emailResponse.error.message || 'Unknown Resend API error',
          });
        } else {
          emailResults.push({
            userId: targetUser.id,
            email: targetUser.email,
            success: true,
            messageId: emailResponse.data?.id,
          });
          console.log(`Email successfully sent to ${targetUser.email}, ID: ${emailResponse.data?.id}`);
        }

      } catch (emailError) {
        console.error(`Failed to send email to ${targetUser.email}:`, emailError);
        emailResults.push({
          userId: targetUser.id,
          email: targetUser.email,
          success: false,
          error: emailError.message,
        });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failureCount = emailResults.filter(r => !r.success).length;

    console.log(`Email sending completed: ${successCount} successful, ${failureCount} failed`);

    // Log the bulk email activity
    await supabaseClient.rpc('log_activity', {
      p_user_id: user.id,
      p_action_type: 'bulk_w9_email',
      p_resource_type: 'w9_forms',
      p_details: {
        total_users: targetUsers.length,
        success_count: successCount,
        failure_count: failureCount,
        reminder_type: reminderType,
        include_roles: includeRoles,
        exclude_completed: excludeCompleted
      }
    });

    return new Response(JSON.stringify({
      success: true,
      totalUsers: targetUsers.length,
      successCount,
      failureCount,
      results: emailResults
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error in bulk-w9-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
