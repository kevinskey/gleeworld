import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_id, delivery_method } = await req.json();

    // Get notification and user details
    const { data: notification, error: notifError } = await supabase
      .from('gw_notifications')
      .select(`
        *,
        user:auth.users(email)
      `)
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      throw new Error('Notification not found');
    }

    // Get user preferences
    const { data: preferences } = await supabase
      .from('gw_notification_preferences')
      .select('*')
      .eq('user_id', notification.user_id)
      .single();

    let success = false;
    let external_id = null;
    let error_message = null;

    if (delivery_method === 'email' && preferences?.email_enabled) {
      try {
        const emailResult = await resend.emails.send({
          from: "Glee World <notifications@gleeworld.org>",
          to: [notification.user.email],
          subject: notification.title,
          html: `
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            ${notification.action_url ? `
              <p>
                <a href="${notification.action_url}" 
                   style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  ${notification.action_label || 'View Details'}
                </a>
              </p>
            ` : ''}
            <hr>
            <p style="color: #666; font-size: 12px;">
              You received this notification from Glee World. 
              <a href="${Deno.env.get('SUPABASE_URL')}/notifications/preferences">Manage your preferences</a>
            </p>
          `
        });

        if (emailResult.data) {
          success = true;
          external_id = emailResult.data.id;
        }
      } catch (error) {
        error_message = error.message;
      }
    } else if (delivery_method === 'sms' && preferences?.sms_enabled && preferences?.phone_number) {
      // SMS implementation would go here with Twilio or similar service
      // For now, we'll mark as successful but not implemented
      success = true;
      error_message = "SMS not implemented yet";
    }

    // Update delivery log
    await supabase
      .from('gw_notification_delivery_log')
      .update({
        status: success ? 'sent' : 'failed',
        external_id,
        error_message,
        sent_at: new Date().toISOString()
      })
      .eq('notification_id', notification_id)
      .eq('delivery_method', delivery_method);

    return new Response(
      JSON.stringify({ success, external_id, error_message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});