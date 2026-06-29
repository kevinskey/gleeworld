// Tenant intake — concierge form posted from inside the demo when a
// user taps "Become a tenant". Unauthenticated by design; uses the
// service-role key to insert into gw_tenant_leads (writes bypass RLS so
// anonymous prospects can submit).
//
// On a valid submission:
//   1. Insert row into gw_tenant_leads (source of truth for the queue)
//   2. Email Kevin with the structured lead details (Resend)
//   3. SMS Kevin (Twilio)
//   4. Confirmation email back to the prospect
//
// No automation — Kevin works the leads queue manually and runs the
// CreateTenantDialog / superadmin API to provision. This function just
// captures the lead with enough structure to act on.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OWNER_EMAIL = "kpj64110@gmail.com";
const OWNER_PHONE = "+14706221392";

interface IntakeRequest {
  org_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  expected_students?: number;
  modules?: string[];
  notes?: string;
  source_tenant_slug?: string;
}

function formatPhone(raw: string): string | null {
  const cleaned = raw.replace(/\D/g, "");
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  if (raw.startsWith("+") && /^\+[1-9]\d{1,14}$/.test(raw)) return raw;
  return null;
}

async function sendTwilio(to: string, body: string): Promise<void> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !from) throw new Error("Twilio not configured");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: IntakeRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const org_name = (payload.org_name ?? "").trim();
  const contact_name = (payload.contact_name ?? "").trim();
  const email = (payload.email ?? "").trim();
  const notes = (payload.notes ?? "").trim();
  const modules = Array.isArray(payload.modules)
    ? payload.modules.filter((m) => typeof m === "string" && m.length).slice(0, 30)
    : [];
  const expected_students =
    typeof payload.expected_students === "number" && payload.expected_students > 0
      ? Math.min(100000, Math.floor(payload.expected_students))
      : null;
  const source_tenant_slug = (payload.source_tenant_slug ?? "demo").trim().slice(0, 64) || "demo";

  if (!org_name || !contact_name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ error: "Org name, contact name, and a valid email are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const phone = payload.phone ? formatPhone(payload.phone) : null;

  // 1. Persist the lead. Uses service-role to bypass RLS so anonymous
  // submissions land.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: leadRow, error: insertError } = await supabase
    .from("gw_tenant_leads")
    .insert({
      source_tenant_slug, org_name, contact_name, email,
      phone, expected_students, modules, notes,
    })
    .select("id")
    .single();
  if (insertError) {
    console.error("[tenant-intake] insert failed", insertError);
    return new Response(JSON.stringify({ error: "Could not save lead" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const leadId = leadRow?.id as string | undefined;

  const errors: string[] = [];
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resend = resendKey ? new Resend(resendKey) : null;

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // 2. Owner email — full structured details + link to leads queue.
  if (resend) {
    try {
      await resend.emails.send({
        from: "GleeWorld <noreply@gleeworld.org>",
        to: [OWNER_EMAIL],
        reply_to: email,
        subject: `Tenant lead: ${org_name}`,
        html: `
          <h2 style="font-family:system-ui,sans-serif;">New tenant lead</h2>
          <table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px;">
            <tr><td style="padding:6px 12px 6px 0;color:#666;">Organization</td><td style="padding:6px 0;font-weight:600;">${escape(org_name)}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#666;">Contact</td><td style="padding:6px 0;">${escape(contact_name)}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#666;">Email</td><td style="padding:6px 0;"><a href="mailto:${escape(email)}">${escape(email)}</a></td></tr>
            ${phone ? `<tr><td style="padding:6px 12px 6px 0;color:#666;">Phone</td><td style="padding:6px 0;">${escape(phone)}</td></tr>` : ""}
            ${expected_students ? `<tr><td style="padding:6px 12px 6px 0;color:#666;">Expected students</td><td style="padding:6px 0;">${expected_students}</td></tr>` : ""}
            ${modules.length ? `<tr><td style="padding:6px 12px 6px 0;color:#666;">Modules</td><td style="padding:6px 0;">${modules.map(escape).join(", ")}</td></tr>` : ""}
            <tr><td style="padding:6px 12px 6px 0;color:#666;">Source</td><td style="padding:6px 0;">${escape(source_tenant_slug)}</td></tr>
          </table>
          ${notes ? `<h3 style="margin-top:24px;font-family:system-ui,sans-serif;">Notes</h3><div style="white-space:pre-wrap;background:#f5f5f7;padding:12px;border-radius:8px;font-family:system-ui,sans-serif;">${escape(notes)}</div>` : ""}
          <p style="color:#999;font-size:12px;margin-top:24px;font-family:system-ui,sans-serif;">Lead id <code>${leadId ?? "?"}</code> · submitted ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</p>
        `,
      });
    } catch (e) {
      errors.push(`owner-email: ${(e as Error).message}`);
    }
  } else {
    errors.push("owner-email: RESEND_API_KEY missing");
  }

  // 3. Owner SMS.
  try {
    const lines = [
      `Tenant lead: ${org_name}`,
      `${contact_name} · ${email}`,
      phone ? phone : null,
      expected_students ? `${expected_students} students` : null,
      modules.length ? `Modules: ${modules.join(", ").slice(0, 100)}` : null,
    ].filter(Boolean);
    await sendTwilio(OWNER_PHONE, lines.join("\n"));
  } catch (e) {
    errors.push(`owner-sms: ${(e as Error).message}`);
  }

  // 4. Prospect confirmation email.
  if (resend) {
    try {
      await resend.emails.send({
        from: "GleeWorld <noreply@gleeworld.org>",
        to: [email],
        reply_to: OWNER_EMAIL,
        subject: "Thanks — we'll be in touch about your GleeWorld site",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;">
            <div style="background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 50%,#c084fc 100%);padding:32px;border-radius:16px 16px 0 0;color:#fff;">
              <h1 style="margin:0;font-size:26px;letter-spacing:-0.02em;">Welcome aboard${contact_name ? `, ${escape(contact_name.split(" ")[0])}` : ""}.</h1>
              <p style="margin:8px 0 0;opacity:0.9;">Your GleeWorld site is one conversation away.</p>
            </div>
            <div style="padding:24px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;">
              <p>Thanks for letting us know that <strong>${escape(org_name)}</strong> wants its own GleeWorld site. Kevin will personally reach out within one business day to walk you through pricing, modules, and what setup looks like for your program.</p>
              <p>In the meantime feel free to keep exploring the demo — anything you build there can be carried over once your tenant is live.</p>
              <p><a href="https://demo.gleeworld.org" style="display:inline-block;background:linear-gradient(90deg,#3b82f6 0%,#8b5cf6 50%,#c084fc 100%);color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600;">Back to the demo →</a></p>
              <p style="color:#666;font-size:14px;margin-top:32px;">— Kevin &amp; the GleeWorld team</p>
            </div>
          </div>
        `,
      });
    } catch (e) {
      errors.push(`prospect-email: ${(e as Error).message}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: errors.length === 0, leadId, errors: errors.length ? errors : undefined }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
