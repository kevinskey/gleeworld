// send-booking-invite — emails each invitee a personal, token'd booking link
// with their currently-open times rendered as one-click buttons.
//
// Every invitee gets a DIFFERENT set of buttons, generated at send time from
// live availability, and each button deep-links to /rsvp/:token?d=&t= — the
// public page preselects that slot and asks for one confirm tap.
//
// Why the buttons don't book on click: corporate mail scanners (Outlook ATP,
// Gmail's link checker) fetch every URL in an email before a human sees it. A
// GET that booked would hand out phantom reservations to invitees who never
// opened the message. The confirm step costs one tap and makes the flow safe.
//
// Availability drifts between send and open, so the page — not the email — is
// the source of truth. The email says as much.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendRequest {
  inviteIds: string[];
  siteUrl?: string;       // e.g. https://gleeworld.org
  subject?: string;
  intro?: string;         // personal note above the times
  senderName?: string;
  replyTo?: string;
  senderId?: string;
  maxSlots?: number;      // how many buttons to show (default 6)
}

const ET = "America/New_York";

const fmtDay = (dateStr: string) =>
  new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });

const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Table-based layout and inline styles throughout: Outlook ignores <style>
// blocks and flexbox, and these buttons are the whole point of the email.
function buildHtml(opts: {
  inviteeName: string;
  serviceName: string;
  durationMinutes: number;
  intro: string;
  slots: Array<{ slot_date: string; start_time: string }>;
  bookingUrl: string;
  maxSlots: number;
}) {
  const byDay = new Map<string, string[]>();
  for (const s of opts.slots.slice(0, opts.maxSlots)) {
    if (!byDay.has(s.slot_date)) byDay.set(s.slot_date, []);
    byDay.get(s.slot_date)!.push(s.start_time);
  }

  const dayBlocks = Array.from(byDay.entries()).map(([day, times]) => {
    // One button per ROW, not per column. Several <td>s in a single <tr>
    // each get ~1/N of the width, and on a phone that squeezes a button down
    // to about 40px — narrow enough that "9:00 AM" wraps one character per
    // line. Full-width rows read the same on a desktop and a phone, and
    // nowrap makes the character-wrap failure impossible regardless.
    const buttons = times.map((t) => `
      <tr><td style="padding:0 0 8px;">
        <a href="${opts.bookingUrl}?d=${day}&t=${t.slice(0, 5)}"
           style="display:block;padding:14px 18px;background:#1e293b;color:#ffffff;
                  text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;
                  text-align:center;white-space:nowrap;
                  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          ${fmtTime(t)}
        </a>
      </td></tr>`).join("");

    return `
      <tr><td style="padding-top:14px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#0f172a;
                  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          ${esc(fmtDay(day))}
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
               style="width:100%;max-width:320px;">${buttons}</table>
      </td></tr>`;
  }).join("");

  const noTimes = `
    <tr><td style="padding-top:14px;">
      <p style="margin:0;font-size:15px;color:#475569;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        My calendar is full at the moment — open the scheduler below and I'll have
        more times posted shortly.
      </p>
    </td></tr>`;

  return `
<div style="background:#f8fafc;padding:28px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
    <tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">

      <p style="margin:0 0 16px;font-size:16px;">Hi ${esc(opts.inviteeName.split(" ")[0])},</p>

      <div style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#334155;">
        ${opts.intro.split("\n").filter(Boolean).map((p) => `<p style="margin:0 0 12px;">${esc(p)}</p>`).join("")}
      </div>

      <p style="margin:0 0 4px;font-size:15px;font-weight:600;">
        Pick a time — ${opts.durationMinutes} minutes on Zoom
      </p>
      <p style="margin:0;font-size:13px;color:#64748b;">
        Tap a time to reserve it. All times Eastern.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${dayBlocks || noTimes}
      </table>

      <p style="margin:22px 0 0;font-size:14px;">
        <a href="${opts.bookingUrl}" style="color:#1d4ed8;text-decoration:underline;">
          See all open times &rarr;
        </a>
      </p>

      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
        These times are live and update as people book, so a slot above may be gone
        by the time you tap it — the scheduler will show you what's still open.
        This link is just for you; please don't forward it.
      </p>

    </td></tr>
  </table>
</div>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SendRequest = await req.json();
    const {
      inviteIds, siteUrl = "https://gleeworld.org", subject,
      intro = "", senderName, replyTo, senderId, maxSlots = 6,
    } = body;

    if (!Array.isArray(inviteIds) || inviteIds.length === 0) {
      throw new Error("inviteIds is required");
    }

    const { data: invites, error: invErr } = await supabase
      .from("gw_booking_invites")
      .select("id, token, invitee_name, invitee_email, message, service_id, send_count, booked_at, revoked_at")
      .in("id", inviteIds);

    if (invErr) throw invErr;

    const results: Array<{ id: string; email: string; sent: boolean; error?: string }> = [];

    for (const invite of invites || []) {
      if (invite.booked_at || invite.revoked_at) {
        results.push({
          id: invite.id, email: invite.invitee_email, sent: false,
          error: invite.booked_at ? "already booked" : "revoked",
        });
        continue;
      }

      try {
        const { data: service } = await supabase
          .from("gw_services")
          .select("name, duration_minutes")
          .eq("id", invite.service_id)
          .single();

        // Same RPC the public page polls — the buttons are built from exactly
        // what a visitor would see this second.
        const { data: slots } = await supabase.rpc("get_invite_available_slots", {
          p_token: invite.token,
          p_days: 21,
        });

        const html = buildHtml({
          inviteeName: invite.invitee_name,
          serviceName: service?.name || "Meeting",
          durationMinutes: service?.duration_minutes || 30,
          intro: intro || invite.message || "",
          slots: (slots || []) as any[],
          bookingUrl: `${siteUrl.replace(/\/$/, "")}/rsvp/${invite.token}`,
          maxSlots,
        });

        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-branded-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            to: invite.invitee_email,
            subject: subject || `Let's find a time — ${service?.name || "meeting"}`,
            html,
            senderName,
            replyTo,
            senderId,
          }),
        });

        if (!response.ok) {
          throw new Error(`send-branded-email failed: ${await response.text()}`);
        }

        await supabase
          .from("gw_booking_invites")
          .update({
            last_sent_at: new Date().toISOString(),
            send_count: (invite.send_count || 0) + 1,
          })
          .eq("id", invite.id);

        results.push({ id: invite.id, email: invite.invitee_email, sent: true });
      } catch (e) {
        console.error("invite send failed", invite.id, e);
        results.push({
          id: invite.id, email: invite.invitee_email, sent: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.filter((r) => r.sent).length,
        failed: results.filter((r) => !r.sent).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-booking-invite error", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
