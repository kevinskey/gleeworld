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

interface EmailAttachment {
  filename: string;
  content: string; // base64-encoded
}

interface SendBrandedEmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  senderName?: string;
  replyTo?: string;
  senderId?: string;
  attachments?: EmailAttachment[];
}

// Strip HTML tags for plain text storage
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── AUTHORIZATION ──────────────────────────────────────────────────
    // This was an OPEN MAIL RELAY: no gate at all, on a function that sends
    // through our Resend account from noreply@gleeworld.org with valid
    // SPF/DKIM. Confirmed 2026-10-02 from the public internet with nothing but
    // the published anon key — it reached payload validation, which means it
    // was past auth. Anyone could have sent perfectly-authenticated phishing
    // as any GleeWorld tenant, and burned the sending reputation that every
    // password reset and invite in the platform depends on.
    //
    // Same gate gw-send-email/index.ts:37 already uses. All four real callers
    // (MessengerModal, Messenger, the assistant's send_email action) run as a
    // signed-in user, so requiring one breaks nothing.
    const callerToken = (req.headers.get("authorization") ?? "").replace(/^bearer\s+/i, "");
    let callerUserId: string | null = null;
    if (callerToken !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      const { data: userData } = await supabase.auth.getUser(callerToken);
      if (!userData?.user) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      callerUserId = userData.user.id;
    }

    const emailData: SendBrandedEmailRequest = await req.json();
    
    console.log("Send Branded Email Request:", {
      to: emailData.to,
      subject: emailData.subject,
      senderName: emailData.senderName,
      senderId: emailData.senderId,
      attachmentCount: emailData.attachments?.length ?? 0,
    });

    if (!emailData.to || !emailData.subject || !emailData.html) {
      throw new Error("Missing required fields: to, subject, and html are required");
    }

    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];

    // Blast ceiling. Unbounded batching turned one authenticated account into a
    // bulk mailer; a signed-in member has no legitimate reason to exceed this,
    // and service-role callers (campaign jobs) are exempt.
    const MAX_RECIPIENTS_PER_CALL = 200;
    if (callerUserId && recipients.length > MAX_RECIPIENTS_PER_CALL) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Too many recipients in one call (${recipients.length}); limit is ${MAX_RECIPIENTS_PER_CALL}.`,
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // The display name is what makes a phish convincing, so a user-supplied
    // caller does not get to choose it — it comes from the sender's own tenant
    // branding. Service-role callers keep the parameter (campaigns legitimately
    // send as a named tenant).
    let senderName = emailData.senderName || "GleeWorld";
    if (callerUserId) {
      const { data: me } = await supabase
        .from("gw_profiles")
        .select("tenant_id, active_tenant_id")
        .eq("user_id", callerUserId)
        .maybeSingle();
      const tid = me?.active_tenant_id ?? me?.tenant_id;
      let resolved = "";
      if (tid) {
        const { data: brand } = await supabase
          .from("gw_branding_settings")
          .select("org_name")
          .eq("tenant_id", tid)
          .maybeSingle();
        resolved = String(brand?.org_name ?? "").replace(/[<>"]/g, "").trim();
      }
      senderName = resolved || "GleeWorld";
    }

    // Build Resend attachments from base64
    const resendAttachments = (emailData.attachments || []).map((att) => ({
      filename: att.filename,
      content: Uint8Array.from(atob(att.content), (c) => c.charCodeAt(0)),
    }));

    // Resend has a 50 recipient limit per API call - batch if needed
    const BATCH_SIZE = 50;
    const batches: string[][] = [];
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      batches.push(recipients.slice(i, i + BATCH_SIZE));
    }

    console.log(`Sending to ${recipients.length} recipients in ${batches.length} batch(es)`);

    const results: { batchIndex: number; success: boolean; id?: string; error?: string }[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      const emailPayload: any = {
        from: `${senderName} <noreply@gleeworld.org>`,
        to: batch,
        subject: emailData.subject,
        html: emailData.html,
      };

      if (resendAttachments.length > 0) {
        emailPayload.attachments = resendAttachments;
      }

      if (emailData.replyTo) {
        emailPayload.reply_to = emailData.replyTo;
      }

      console.log(`Sending batch ${batchIndex + 1}/${batches.length} (${batch.length} recipients)...`);
      
      try {
        const emailResponse = await resend.emails.send(emailPayload);

        if (emailResponse.error) {
          console.error(`Batch ${batchIndex + 1} failed:`, emailResponse.error);
          results.push({ 
            batchIndex, 
            success: false, 
            error: emailResponse.error.message 
          });
        } else {
          console.log(`Batch ${batchIndex + 1} sent successfully:`, emailResponse.data?.id);
          results.push({ 
            batchIndex, 
            success: true, 
            id: emailResponse.data?.id 
          });
        }
      } catch (batchError: any) {
        console.error(`Batch ${batchIndex + 1} error:`, batchError);
        results.push({ 
          batchIndex, 
          success: false, 
          error: batchError.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const allSuccess = failCount === 0;

    // Log to history if senderId provided
    if (emailData.senderId) {
      try {
        await supabase.from('gw_user_message_history').insert({
          user_id: emailData.senderId,
          direction: 'sent',
          channel: 'email',
          subject: emailData.subject,
          content: stripHtml(emailData.html).slice(0, 5000),
          recipient_emails: recipients,
          status: allSuccess ? 'sent' : (successCount > 0 ? 'partial' : 'failed'),
          external_id: results.find(r => r.id)?.id,
          error_message: failCount > 0 ? `${failCount} of ${batches.length} batches failed` : null,
          sent_at: new Date().toISOString()
        });
        console.log("Email logged to history");
      } catch (logError) {
        console.error("Error logging email to history:", logError);
      }
    }

    if (!allSuccess && successCount === 0) {
      throw new Error(`All ${batches.length} batches failed to send`);
    }

    return new Response(JSON.stringify({
      success: true,
      batches: batches.length,
      successfulBatches: successCount,
      failedBatches: failCount,
      message: `Email sent to ${recipients.length} recipient(s) in ${batches.length} batch(es)`
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
