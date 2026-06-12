import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Authorize: service-role callers pass; otherwise require a signed-in user.
    const callerToken = (req.headers.get("authorization") ?? "").replace(/^bearer\s+/i, "");
    if (callerToken !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: userData } = await admin.auth.getUser(callerToken);
      if (!userData?.user) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const emailData: SendEmailRequest = await req.json();

    console.log("GleeWorld Email Request:", {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from
    });

    // Only allow senders on our verified domain; otherwise spoofed From
    // addresses would relay through Resend under our account.
    const requestedFrom = emailData.from ?? "";
    const fromAddress = /(@|<[^>]*@)gleeworld\.org>?\s*$/i.test(requestedFrom)
      ? requestedFrom
      : "GleeWorld <noreply@gleeworld.org>";

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