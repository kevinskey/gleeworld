import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendBrandedEmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  senderName?: string;
  replyTo?: string;
  senderId?: string; // User ID for logging
}

// Strip HTML tags for plain text storage
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: SendBrandedEmailRequest = await req.json();
    
    console.log("Send Branded Email Request:", {
      to: emailData.to,
      subject: emailData.subject,
      senderName: emailData.senderName,
      senderId: emailData.senderId
    });

    // Validate required fields
    if (!emailData.to || !emailData.subject || !emailData.html) {
      throw new Error("Missing required fields: to, subject, and html are required");
    }

    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
    const senderName = emailData.senderName || "GleeWorld";

    const emailPayload: any = {
      from: `${senderName} <noreply@gleeworld.org>`,
      to: recipients,
      subject: emailData.subject,
      html: emailData.html,
    };

    // Add reply-to if provided
    if (emailData.replyTo) {
      emailPayload.reply_to = emailData.replyTo;
    }

    console.log("Sending email via Resend...");
    const emailResponse = await resend.emails.send(emailPayload);

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      
      // Log failed message if senderId provided
      if (emailData.senderId) {
        try {
          await supabase.from('gw_user_message_history').insert({
            user_id: emailData.senderId,
            direction: 'sent',
            channel: 'email',
            subject: emailData.subject,
            content: stripHtml(emailData.html).slice(0, 5000),
            recipient_emails: recipients,
            status: 'failed',
            error_message: emailResponse.error.message || 'Email delivery failed',
            sent_at: new Date().toISOString()
          });
          console.log("Failed email logged to history");
        } catch (logError) {
          console.error("Error logging failed email:", logError);
        }
      }
      
      throw new Error(emailResponse.error.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResponse.data?.id);

    // Log successful message if senderId provided
    if (emailData.senderId) {
      try {
        await supabase.from('gw_user_message_history').insert({
          user_id: emailData.senderId,
          direction: 'sent',
          channel: 'email',
          subject: emailData.subject,
          content: stripHtml(emailData.html).slice(0, 5000),
          recipient_emails: recipients,
          status: 'sent',
          external_id: emailResponse.data?.id,
          sent_at: new Date().toISOString()
        });
        console.log("Email logged to history");
      } catch (logError) {
        console.error("Error logging email to history:", logError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      id: emailResponse.data?.id,
      message: `Email sent to ${recipients.length} recipient(s)`
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-branded-email function:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to send email",
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
