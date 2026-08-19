// booking-invite-confirm — fires after a guest books through /rsvp/:token.
//
// Sends three things:
//   1. Email confirmation to the invitee (their only channel — they have no
//      GleeWorld account and no dashboard to check)
//   2. SMS confirmation to the invitee, if they gave a number
//   3. SMS alert to the host, so a booking never sits unnoticed
//
// Callable by anon on purpose: the guest's browser invokes it straight after
// booking, and the guest has no session. The invite token is the credential,
// and it only works on an invite that is already booked — so this cannot be
// used to send mail to an address of the caller's choosing.
//
// Idempotent via confirmation_sent_at. A page refresh, a double-tap, or a
// retried request must not text the same people twice.

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

const GOOGLE_WRITE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

async function refreshGoogleToken(refreshToken: string, clientId: string, clientSecret: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("refresh_failed: " + (await res.text()).slice(0, 200));
  return await res.json() as { access_token: string; expires_in: number };
}

// Creates ONE event on the host's calendar with a Google Meet link and the
// guest as an attendee, and returns the Meet URL.
//
// Deliberately not routed through google-push-appointment: that function
// requires a caller JWT (a guest has none), and for an invite booking both
// created_by and instructor_user_id are the host — so it would push two
// duplicate events onto the same calendar. One event, one link, guest invited.
async function createMeetEvent(opts: {
  hostUserId: string;
  appointmentId: string;
  summary: string;
  description: string;
  startIso: string;
  minutes: number;
  guestEmail: string;
  tenantId: string | null;
}): Promise<{ meetUrl: string | null; eventId: string | null; error?: string }> {
  const clientId = Deno.env.get("GW_GOOGLE_CAL_CLIENT_ID");
  const clientSecret = Deno.env.get("GW_GOOGLE_CAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { meetUrl: null, eventId: null, error: "google_not_configured" };

  const { data: conn } = await admin
    .from("gw_google_connections")
    .select("*")
    .eq("user_id", opts.hostUserId)
    .maybeSingle();

  if (!conn || !(conn.scope ?? "").includes(GOOGLE_WRITE_SCOPE)) {
    return { meetUrl: null, eventId: null, error: "no_write_connection" };
  }

  let accessToken: string = conn.access_token;
  if (!accessToken || !conn.expires_at || new Date(conn.expires_at) < new Date()) {
    const r = await refreshGoogleToken(conn.refresh_token, clientId, clientSecret);
    accessToken = r.access_token;
    await admin.from("gw_google_connections")
      .update({
        access_token: r.access_token,
        expires_at: new Date(Date.now() + (r.expires_in - 30) * 1000).toISOString(),
        last_error: null,
      })
      .eq("id", conn.id);
  }

  const endIso = new Date(new Date(opts.startIso).getTime() + opts.minutes * 60_000).toISOString();

  // conferenceDataVersion=1 is what actually makes Google mint the Meet link;
  // without it the createRequest is silently ignored.
  // sendUpdates=all makes Google email the guest a proper calendar invite.
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    + "?conferenceDataVersion=1&sendUpdates=all";

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: opts.summary,
      description: opts.description || undefined,
      start: { dateTime: opts.startIso, timeZone: "America/New_York" },
      end: { dateTime: endIso, timeZone: "America/New_York" },
      attendees: [{ email: opts.guestEmail }],
      conferenceData: {
        createRequest: {
          // Must be unique per request; the appointment id is exactly that.
          requestId: opts.appointmentId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      extendedProperties: {
        private: {
          gleeworld_appointment_id: opts.appointmentId,
          gleeworld_tenant_id: opts.tenantId ?? "",
          side: "instructor",
        },
      },
    }),
  });

  if (!resp.ok) {
    return { meetUrl: null, eventId: null, error: "google_write_failed: " + (await resp.text()).slice(0, 200) };
  }

  const created = await resp.json() as {
    id: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> };
  };

  const meetUrl = created.hangoutLink
    || created.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri
    || null;

  return { meetUrl, eventId: created.id };
}

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("1") && digits.length === 11) return "+" + digits;
  if (digits.length === 10) return "+1" + digits;
  if (p.trim().startsWith("+")) return "+" + digits;
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
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { token, siteUrl = "https://gleeworld.org" } = await req.json();
    if (!token) return json({ error: "token is required" }, 400);

    const { data: invite } = await admin
      .from("gw_booking_invites")
      .select("id, invitee_name, invitee_email, invitee_phone, service_id, created_by, appointment_id, booked_at, confirmation_sent_at")
      .eq("token", token)
      .maybeSingle();

    if (!invite) return json({ error: "invalid_token" }, 404);
    // Only a completed booking earns a confirmation.
    if (!invite.booked_at || !invite.appointment_id) return json({ error: "not_booked" }, 409);
    if (invite.confirmation_sent_at) return json({ success: true, skipped: "already_sent" });

    const [{ data: appt }, { data: service }] = await Promise.all([
      admin.from("gw_appointments")
        .select("appointment_date, duration_minutes, status, notes, tenant_id")
        .eq("id", invite.appointment_id).maybeSingle(),
      admin.from("gw_services")
        .select("name, location, duration_minutes, instructor")
        .eq("id", invite.service_id).maybeSingle(),
    ]);

    if (!appt) return json({ error: "appointment_missing" }, 404);

    const { data: host } = await admin
      .from("gw_profiles")
      .select("full_name, email, phone_number, phone")
      .eq("user_id", invite.created_by)
      .maybeSingle();

    const start = new Date(appt.appointment_date);
    const dateStr = start.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
      timeZone: "America/New_York",
    });
    const timeStr = start.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit",
      timeZone: "America/New_York",
    });

    const serviceName = service?.name || "Meeting";
    const minutes = appt.duration_minutes || service?.duration_minutes || 30;
    const location = service?.location || "Zoom";
    // How the host is named to the guest. The service's own instructor field
    // wins so it can carry a full professional title ("Dr. Kevin Phillip
    // Johnson") without renaming the profile everywhere else in the app.
    // Collapses stray double spaces, which profile names tend to accumulate.
    const hostName = (service?.instructor || host?.full_name || "GleeWorld")
      .replace(/\s+/g, " ").trim();
    const pending = appt.status === "pending";
    const results: Record<string, unknown> = {};

    // ── 0. Mint the Meet link first, so email and SMS can both carry it ──
    // A pending (approval-required) booking gets no link yet — the host has
    // not agreed to the time, and a live link would imply they had.
    let meetUrl: string | null = null;
    if (!pending) {
      try {
        const meet = await createMeetEvent({
          hostUserId: invite.created_by,
          appointmentId: invite.appointment_id,
          summary: `${serviceName} — ${invite.invitee_name}`,
          description: appt.notes || "",
          startIso: start.toISOString(),
          minutes,
          guestEmail: invite.invitee_email,
          tenantId: (appt as any).tenant_id ?? null,
        });
        meetUrl = meet.meetUrl;
        if (meet.eventId) {
          await admin.from("gw_appointments")
            .update({ meeting_url: meetUrl, instructor_google_event_id: meet.eventId })
            .eq("id", invite.appointment_id);
        }
        results.meet = meet.error
          ? { status: "error", error: meet.error }
          : { status: "created", url: meetUrl };
      } catch (e) {
        // Never block the confirmation on Google. The booking stands; the
        // host can send a link by hand if this failed.
        results.meet = { status: "error", error: String(e) };
      }
    } else {
      results.meet = { status: "skipped", reason: "pending_approval" };
    }

    const joinLine = meetUrl
      ? `Join here: ${meetUrl}`
      : "I'll send the meeting link before we meet.";

    // ── 1. Email the invitee ────────────────────────────────────────────
    const html = `
<div style="background:#f8fafc;padding:28px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
    <tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
      <p style="margin:0 0 14px;font-size:16px;">Hi ${esc(invite.invitee_name.split(" ")[0])},</p>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#334155;">
        ${pending
          ? `Thanks for picking a time. I'll confirm ${esc(serviceName)} shortly.`
          : `You're confirmed. Thank you for making the time to talk with me.`}
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="background:#f1f5f9;border-radius:12px;padding:18px;margin-bottom:20px;">
        <tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <p style="margin:0 0 4px;font-size:13px;color:#64748b;">${esc(serviceName)}</p>
          <p style="margin:0;font-size:17px;font-weight:600;color:#0f172a;">${esc(dateStr)}</p>
          <p style="margin:2px 0 0;font-size:22px;font-weight:700;color:#0f172a;">${esc(timeStr)}
            <span style="font-size:13px;font-weight:400;color:#64748b;">Eastern</span></p>
          <p style="margin:8px 0 0;font-size:14px;color:#475569;">${minutes} minutes &middot; ${esc(meetUrl ? "Google Meet" : location)}</p>
        </td></tr>
      </table>
      ${meetUrl ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr><td>
          <a href="${esc(meetUrl)}"
             style="display:inline-block;padding:13px 26px;background:#1e293b;color:#ffffff;
                    text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            Join the meeting
          </a>
        </td></tr>
      </table>
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;word-break:break-all;">
        Or paste this link: ${esc(meetUrl)}
      </p>` : ""}
      <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.6;">
        ${meetUrl
          // Google auto-adds invitations for Gmail/Workspace accounts but sends
          // everyone else an .ics they must accept — so this asks rather than
          // asserts. Most of these guests are on district mail systems.
          ? "You'll also get a calendar invitation from Google — accept it to add this to your calendar. If you need to change or cancel, just reply to this email."
          : "I'll send the meeting link before we meet. If you need to change or cancel, just reply to this email."}
      </p>
      <p style="margin:22px 0 0;font-size:14px;color:#0f172a;">— ${esc(hostName)}</p>
    </td></tr>
  </table>
</div>`;

    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-branded-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          to: invite.invitee_email,
          subject: pending
            ? `Received: ${serviceName} with ${hostName}`
            : `Confirmed: ${serviceName} with ${hostName}`,
          html,
          senderName: hostName,
          replyTo: host?.email,
          senderId: invite.created_by,
        }),
      });
      if (!r.ok) throw new Error((await r.text()).slice(0, 200));
      results.email = { status: "sent", to: invite.invitee_email };
    } catch (e) {
      results.email = { status: "error", error: String(e) };
    }

    // ── 2. SMS the invitee ──────────────────────────────────────────────
    const guestPhone = normalizePhone(invite.invitee_phone);
    if (guestPhone) {
      try {
        await sendTwilio(
          guestPhone,
          pending
            ? `${hostName}: Got your request for "${serviceName}" on ${dateStr} at ${timeStr} ET. I'll confirm shortly.`
            : `${hostName}: You're confirmed for "${serviceName}" on ${dateStr} at ${timeStr} ET (${minutes} min). ${joinLine}`,
        );
        results.guestSms = { status: "sent", to: guestPhone };
      } catch (e) {
        results.guestSms = { status: "error", error: String(e) };
      }
    } else {
      results.guestSms = { status: "skipped", reason: "no_phone" };
    }

    // ── 3. SMS the host ─────────────────────────────────────────────────
    const hostPhone = normalizePhone(host?.phone_number || host?.phone);
    if (hostPhone) {
      try {
        await sendTwilio(
          hostPhone,
          `GleeWorld: ${invite.invitee_name} booked "${serviceName}" for ${dateStr} at ${timeStr} ET.` +
          `${invite.invitee_email ? ` ${invite.invitee_email}.` : ""}` +
          `${guestPhone ? ` ${guestPhone}.` : ""}` +
          `${appt.notes ? ` Note: ${String(appt.notes).slice(0, 90)}` : ""}` +
          `${meetUrl ? ` Meet: ${meetUrl}` : " No Meet link — send one manually."}`,
        );
        results.hostSms = { status: "sent", to: hostPhone };
      } catch (e) {
        results.hostSms = { status: "error", error: String(e) };
      }
    } else {
      results.hostSms = { status: "skipped", reason: "no_host_phone" };
    }

    // Stamped even on partial failure: better one missed confirmation than a
    // retry loop texting someone repeatedly. Failures are logged and returned.
    await admin
      .from("gw_booking_invites")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", invite.id);

    console.log("booking-invite-confirm", invite.id, JSON.stringify(results));
    return json({ success: true, results });
  } catch (e) {
    console.error("booking-invite-confirm error", e);
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
