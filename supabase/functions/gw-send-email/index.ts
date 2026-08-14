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

    // Resend hard-caps `to` at 50 addresses, and a big broadcast must not
    // expose every address to every recipient anyway. Multi-recipient sends
    // go out in BCC chunks (to: = our own from address); a single recipient
    // keeps the normal To: header. Explicit cc/bcc passthrough only applies
    // to single-recipient sends.
    // 49, not 50: BCC chunks also carry our own address in To:, and Resend's
    // 50-recipient cap counts to + cc + bcc together (learned from a live 422).
    const BATCH = 49;
    const recipients: string[] = emailPayload.to;
    const chunks: string[][] = [];
    if (recipients.length > 1) {
      for (let i = 0; i < recipients.length; i += BATCH) {
        chunks.push(recipients.slice(i, i + BATCH));
      }
    } else {
      chunks.push(recipients);
    }

    let sentCount = 0;
    const errors: string[] = [];
    const ids: string[] = [];
    for (const [i, chunk] of chunks.entries()) {
      const payload = { ...emailPayload };
      if (recipients.length > 1) {
        payload.to = [fromAddress.replace(/^.*<|>$/g, "") || "noreply@gleeworld.org"];
        payload.bcc = chunk;
        delete payload.cc;
      }
      // resend-js does NOT throw on API errors — it returns { data, error }.
      // The old code ignored `error` and reported success on rejected sends.
      const { data, error } = await resend.emails.send(payload);
      if (error) {
        console.error(`Batch ${i + 1}/${chunks.length} failed:`, error);
        errors.push(`batch ${i + 1}: ${error.message ?? JSON.stringify(error)}`);
      } else {
        sentCount += chunk.length;
        if (data?.id) ids.push(data.id);
      }
      // Stay under Resend's request rate limit between chunks.
      if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 600));
    }

    if (errors.length > 0) {
      console.error(`Send finished with failures: ${sentCount}/${recipients.length} delivered`, errors);
      return new Response(JSON.stringify({
        success: false,
        error: `Sent ${sentCount} of ${recipients.length} recipients; failures: ${errors.join("; ")}`,
        sentCount,
        totalCount: recipients.length,
      }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Email sent successfully to ${sentCount} recipient(s) in ${chunks.length} batch(es)`, ids);

    return new Response(JSON.stringify({
      success: true,
      id: ids[0],
      ids,
      sentCount,
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