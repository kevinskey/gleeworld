import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: SendEmailRequest = await req.json();
    
    console.log("GleeWorld Email Request:", {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from
    });

    // Default from address for GleeWorld Academy
    const fromAddress = emailData.from || "GleeWorld Academy <onboarding@resend.dev>";

    const emailPayload: any = {
      from: fromAddress,
      to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
      subject: emailData.subject,
    };

    // Add content (prefer HTML over text)
    if (emailData.html) {
      emailPayload.html = emailData.html;
    } else if (emailData.text) {
      emailPayload.text = emailData.text;
    } else {
      throw new Error("Either html or text content must be provided");
    }

    // Optional fields
    if (emailData.replyTo) emailPayload.reply_to = emailData.replyTo;
    if (emailData.cc?.length) emailPayload.cc = emailData.cc;
    if (emailData.bcc?.length) emailPayload.bcc = emailData.bcc;
    if (emailData.attachments?.length) emailPayload.attachments = emailData.attachments;

    const emailResponse = await resend.emails.send(emailPayload);

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      id: emailResponse.data?.id,
      message: "Email sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in gw-send-email function:", error);
    
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