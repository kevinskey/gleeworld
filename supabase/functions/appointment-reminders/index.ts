// appointment-reminders — sweeps for confirmed appointments coming up in
// ~24 hours and ~1 hour, and nudges the guest by email and SMS.
//
// Driven by system cron on the droplet (every 15 minutes), matching how the
// VIP454 mailers already run there. Service-role only: no anon path, because
// nothing about this needs to be reachable from a browser.
//
// Idempotency is per-appointment-per-kind via reminder_24h_sent_at /
// reminder_1h_sent_at. The stamp is written even when a send fails, on
// purpose: a Twilio outage should cost one missed reminder, not a loop that
// re-texts someone every 15 minutes until it recovers. Failures are logged.
//
// The 24h window is deliberately 2 hours wide and the 1h window 30 minutes,
// so a skipped cron tick still yields a reminder rather than a silent gap.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("1") && digits.length === 11) return "+" + digits;
  if (digits.length === 10) return "+1" + digits;
  return "+" + digits;
}

async function sendTwilio(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !from) throw new Error("twilio_not_configured");
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  if (!r.ok) throw new Error((await r.text()).slice(0, 200));
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Service-role only. The cron script sends the key; a browser never should.
  const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!auth || auth !== SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "forbidden" }, 403);
  }

  try {
    const { data: due, error } = await admin.rpc("appointments_due_for_reminder");
    if (error) throw error;

    const rows = (due || []) as Array<{
      appointment_id: string; kind: "24h" | "1h";
      client_name: string; client_email: string; client_phone: string | null;
      appointment_date: string; duration_minutes: number;
      meeting_url: string | null; service_name: string | null; host_user_id: string | null;
    }>;

    if (!rows.length) return json({ success: true, sent: 0, checked: 0 });

    // One profile lookup per distinct host rather than per appointment.
    const hostIds = [...new Set(rows.map((r) => r.host_user_id).filter(Boolean))] as string[];
    const { data: hosts } = await admin
      .from("gw_profiles").select("user_id, full_name, email").in("user_id", hostIds);
    const hostById = new Map((hosts || []).map((h: any) => [h.user_id, h]));

    const results: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      const host = row.host_user_id ? hostById.get(row.host_user_id) : null;
      const hostName = (host?.full_name || "GleeWorld").replace(/\s+/g, " ").trim();
      const serviceName = row.service_name || "Meeting";
      const start = new Date(row.appointment_date);

      const dateStr = start.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York",
      });
      const timeStr = start.toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
      });

      const lead = row.kind === "24h" ? "tomorrow" : "in about an hour";
      const outcome: Record<string, unknown> = { id: row.appointment_id, kind: row.kind };

      const joinBlock = row.meeting_url
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
             <tr><td>
               <a href="${esc(row.meeting_url)}"
                  style="display:inline-block;padding:13px 26px;background:#1e293b;color:#ffffff;
                         text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;">
                 Join the meeting
               </a>
             </td></tr>
           </table>
           <p style="margin:0 0 8px;font-size:13px;color:#64748b;word-break:break-all;">
             Or paste this link: ${esc(row.meeting_url)}
           </p>`
        : `<p style="margin:0 0 18px;font-size:15px;color:#475569;">
             I'll send the meeting link shortly.
           </p>`;

      const html = `
<div style="background:#f8fafc;padding:28px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
    <tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
      <p style="margin:0 0 14px;font-size:16px;">Hi ${esc(String(row.client_name).split(" ")[0])},</p>
      <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#334155;">
        A quick reminder about our discussion <strong>${lead}</strong>.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="background:#f1f5f9;border-radius:12px;padding:18px;margin-bottom:20px;">
        <tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <p style="margin:0 0 4px;font-size:13px;color:#64748b;">${esc(serviceName)}</p>
          <p style="margin:0;font-size:17px;font-weight:600;">${esc(dateStr)}</p>
          <p style="margin:2px 0 0;font-size:22px;font-weight:700;">${esc(timeStr)}
            <span style="font-size:13px;font-weight:400;color:#64748b;">Eastern</span></p>
          <p style="margin:8px 0 0;font-size:14px;color:#475569;">${row.duration_minutes || 30} minutes</p>
        </td></tr>
      </table>
      ${joinBlock}
      <p style="margin:0;font-size:14px;color:#0f172a;">— ${esc(hostName)}</p>
    </td></tr>
  </table>
</div>`;

      if (row.client_email) {
        try {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-branded-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              to: row.client_email,
              subject: row.kind === "24h"
                ? `Tomorrow: ${serviceName} at ${timeStr} ET`
                : `Starting soon: ${serviceName} at ${timeStr} ET`,
              html, senderName: hostName, replyTo: host?.email, senderId: row.host_user_id,
            }),
          });
          outcome.email = resp.ok ? "sent" : `error: ${(await resp.text()).slice(0, 120)}`;
        } catch (e) {
          outcome.email = `error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      const phone = normalizePhone(row.client_phone);
      if (phone) {
        try {
          await sendTwilio(
            phone,
            `${hostName}: A quick reminder about our discussion ${lead === "tomorrow" ? `tomorrow, ${dateStr},` : "in about an hour,"} at ${timeStr} ET.` +
            `${row.meeting_url ? ` Join: ${row.meeting_url}` : ""}`,
          );
          outcome.sms = "sent";
        } catch (e) {
          outcome.sms = `error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      await admin
        .from("gw_appointments")
        .update(row.kind === "24h"
          ? { reminder_24h_sent_at: new Date().toISOString() }
          : { reminder_1h_sent_at: new Date().toISOString() })
        .eq("id", row.appointment_id);

      results.push(outcome);
    }

    console.log("appointment-reminders", JSON.stringify(results));
    return json({ success: true, checked: rows.length, results });
  } catch (e) {
    console.error("appointment-reminders error", e);
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
