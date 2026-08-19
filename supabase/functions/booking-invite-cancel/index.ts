// booking-invite-cancel — a guest cancels or reschedules their own booking.
//
// Anon-callable and token-gated, like the rest of the guest surface. It never
// acts on a GET: the page collects a confirmation first, because mail scanners
// prefetch links and a cancel-on-load would wipe bookings nobody touched.
//
// Order matters. The Google event is removed BEFORE the row is freed, while
// the event ids are still readable. If Google fails we carry on anyway — a
// stale calendar entry is a smaller problem than a guest who cannot cancel.

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

async function deleteGoogleEvent(hostUserId: string, eventId: string) {
  const clientId = Deno.env.get("GW_GOOGLE_CAL_CLIENT_ID");
  const clientSecret = Deno.env.get("GW_GOOGLE_CAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("google_not_configured");

  const { data: conn } = await admin
    .from("gw_google_connections").select("*").eq("user_id", hostUserId).maybeSingle();
  if (!conn) throw new Error("no_connection");

  let accessToken: string = conn.access_token;
  if (!accessToken || !conn.expires_at || new Date(conn.expires_at) < new Date()) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: conn.refresh_token, grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error("refresh_failed");
    const r = await res.json();
    accessToken = r.access_token;
    await admin.from("gw_google_connections").update({
      access_token: r.access_token,
      expires_at: new Date(Date.now() + (r.expires_in - 30) * 1000).toISOString(),
    }).eq("id", conn.id);
  }

  // sendUpdates=all so the guest's own calendar copy disappears too.
  const del = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  // 410 means it was already gone, which is a success for our purposes.
  if (!del.ok && del.status !== 410 && del.status !== 404) {
    throw new Error(`google_delete_failed_${del.status}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { token, mode = "cancel", reason, siteUrl = "https://gleeworld.org" } = await req.json();
    if (!token) return json({ error: "token is required" }, 400);

    // Read the host + service before the RPC frees the row.
    const { data: invite } = await admin
      .from("gw_booking_invites")
      .select("id, created_by, service_id, invitee_name, invitee_email")
      .eq("token", token).maybeSingle();
    if (!invite) return json({ success: false, error: "invalid_invite" }, 404);

    const { data: result, error } = await admin.rpc("cancel_invite_booking", {
      p_token: token, p_mode: mode, p_reason: reason ?? null,
    });
    if (error) throw error;
    if (!(result as any)?.success) return json(result, 409);

    const r = result as any;
    const outcome: Record<string, unknown> = { mode };

    // ── Google ──────────────────────────────────────────────────────────
    for (const [label, eventId] of [
      ["instructor", r.instructor_google_event_id],
      ["student", r.student_google_event_id],
    ] as const) {
      if (!eventId) continue;
      try {
        await deleteGoogleEvent(invite.created_by, eventId);
        outcome[`google_${label}`] = "deleted";
      } catch (e) {
        console.error("google delete failed", label, e);
        outcome[`google_${label}`] = `error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    const { data: host } = await admin
      .from("gw_profiles").select("full_name, email, phone_number, phone")
      .eq("user_id", invite.created_by).maybeSingle();
    const { data: service } = await admin
      .from("gw_services").select("name, instructor").eq("id", invite.service_id).maybeSingle();

    const hostName = (service?.instructor || host?.full_name || "GleeWorld")
      .replace(/\s+/g, " ").trim();
    const serviceName = service?.name || "Meeting";
    const when = r.was_at
      ? new Date(r.was_at).toLocaleString("en-US", {
          weekday: "short", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
        })
      : "the scheduled time";

    // ── Tell the host ───────────────────────────────────────────────────
    // This is the whole point of the feature: a cancellation nobody hears
    // about is worse than no cancel button at all.
    const hostPhone = normalizePhone(host?.phone_number || host?.phone);
    if (hostPhone) {
      try {
        await sendTwilio(
          hostPhone,
          mode === "reschedule"
            ? `GleeWorld: ${r.invitee_name} is rescheduling "${serviceName}" — was ${when} ET. That slot is open again.`
            : `GleeWorld: ${r.invitee_name} cancelled "${serviceName}" — was ${when} ET.${reason ? ` Reason: ${String(reason).slice(0, 80)}` : ""}`,
        );
        outcome.hostSms = "sent";
      } catch (e) {
        outcome.hostSms = `error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    // ── Confirm to the guest, for a plain cancel only ────────────────────
    // On a reschedule they are still mid-flow; the new booking's confirmation
    // is the message that matters, and a "cancelled" email in between reads
    // as a mistake.
    if (mode === "cancel") {
      const html = `
<div style="background:#f8fafc;padding:28px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
    <tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
      <p style="margin:0 0 14px;font-size:16px;">Hi ${String(r.invitee_name).split(" ")[0]},</p>
      <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#334155;">
        Your ${serviceName} on ${when} Eastern has been cancelled. Nothing further is needed.
      </p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">
        If you would still like to talk, your original link still works — just pick a new time.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
        <tr><td>
          <a href="${siteUrl.replace(/\/$/, "")}/rsvp/${token}"
             style="display:inline-block;padding:13px 24px;background:#1e293b;color:#ffffff;
                    text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">
            Pick a new time
          </a>
        </td></tr>
      </table>
      <p style="margin:0;font-size:14px;color:#0f172a;">— ${hostName}</p>
    </td></tr>
  </table>
</div>`;
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-branded-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            to: r.invitee_email,
            subject: `Cancelled: ${serviceName}`,
            html, senderName: hostName, replyTo: host?.email, senderId: invite.created_by,
          }),
        });
        outcome.guestEmail = resp.ok ? "sent" : `error: ${(await resp.text()).slice(0, 120)}`;
      } catch (e) {
        outcome.guestEmail = `error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    console.log("booking-invite-cancel", invite.id, JSON.stringify(outcome));
    return json({ success: true, mode, results: outcome });
  } catch (e) {
    console.error("booking-invite-cancel error", e);
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
