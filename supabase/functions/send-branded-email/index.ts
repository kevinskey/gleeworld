import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
}

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
      senderName: emailData.senderName
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
      throw new Error(emailResponse.error.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResponse.data?.id);

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
