// Public landing-page "Get started" inquiry handler. Unauthenticated by
// design — the marketing site posts directly from a browser dialog.
//
// On a valid submission:
//   1. Email inquiry → kpj64110@gmail.com (Resend)
//   2. SMS inquiry  → 4706221392 (Twilio)
//   3. Confirmation email to inquirer
//   4. Confirmation SMS to inquirer (if phone provided)
//
// Twilio + Resend creds come from the standard env vars used by the other
// gw-send-* functions, so no new secrets are needed.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OWNER_EMAIL = "kpj64110@gmail.com";
const OWNER_PHONE = "+14706221392";

interface InquiryRequest {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  role?: string;
  message?: string;
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
  if (!sid || !token || !from) {
    throw new Error("Twilio not configured");
  }
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
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio ${res.status}: ${err}`);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: InquiryRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim();
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ error: "Name and a valid email are required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const phone = payload.phone ? formatPhone(payload.phone) : null;
  const organization = (payload.organization ?? "").trim();
  const role = (payload.role ?? "").trim();
  const message = (payload.message ?? "").trim();

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "Email not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const resend = new Resend(resendKey);

  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const errors: string[] = [];

  // 1. Inquiry email to owner
  try {
    await resend.emails.send({
      from: "GleeWorld <noreply@gleeworld.org>",
      to: [OWNER_EMAIL],
      reply_to: email,
      subject: `GleeWorld inquiry from ${name}`,
      html: `
        <h2>New GleeWorld inquiry</h2>
        <table style="border-collapse:collapse;font-family:system-ui,sans-serif;">
          <tr><td style="padding:6px 12px 6px 0;color:#666;">Name</td><td style="padding:6px 0;">${escape(name)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#666;">Email</td><td style="padding:6px 0;"><a href="mailto:${escape(email)}">${escape(email)}</a></td></tr>
          ${phone ? `<tr><td style="padding:6px 12px 6px 0;color:#666;">Phone</td><td style="padding:6px 0;">${escape(phone)}</td></tr>` : ""}
          ${organization ? `<tr><td style="padding:6px 12px 6px 0;color:#666;">Organization</td><td style="padding:6px 0;">${escape(organization)}</td></tr>` : ""}
          ${role ? `<tr><td style="padding:6px 12px 6px 0;color:#666;">Role</td><td style="padding:6px 0;">${escape(role)}</td></tr>` : ""}
        </table>
        ${message ? `<h3 style="margin-top:24px;">Message</h3><div style="white-space:pre-wrap;background:#f5f5f7;padding:12px;border-radius:8px;">${escape(message)}</div>` : ""}
        <p style="color:#999;font-size:12px;margin-top:24px;">Submitted ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</p>
      `,
    });
  } catch (e) {
    errors.push(`owner-email: ${(e as Error).message}`);
  }

  // 2. SMS to owner
  try {
    const lines = [
      `GleeWorld inquiry: ${name}`,
      email,
      phone ? `Phone: ${phone}` : null,
      organization ? `Org: ${organization}` : null,
      role ? `Role: ${role}` : null,
      message ? `"${message.slice(0, 200)}${message.length > 200 ? "…" : ""}"` : null,
    ].filter(Boolean);
    await sendTwilio(OWNER_PHONE, lines.join("\n"));
  } catch (e) {
    errors.push(`owner-sms: ${(e as Error).message}`);
  }

  // 3. Confirmation email to inquirer
  try {
    await resend.emails.send({
      from: "GleeWorld <noreply@gleeworld.org>",
      to: [email],
      reply_to: OWNER_EMAIL,
      subject: "Thanks for your interest in GleeWorld",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;">
          <div style="background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 50%,#c084fc 100%);padding:32px;border-radius:16px 16px 0 0;color:#fff;">
            <h1 style="margin:0;font-size:28px;letter-spacing:-0.02em;">Welcome to GleeWorld</h1>
            <p style="margin:8px 0 0;opacity:0.9;">Run your music program. Beautifully.</p>
          </div>
          <div style="padding:24px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;">
            <p>Hi ${escape(name)},</p>
            <p>Thanks for reaching out about GleeWorld. We received your inquiry and Kevin will follow up personally within one business day.</p>
            <p>In the meantime, you can poke around the live demo here:</p>
            <p><a href="https://demo.gleeworld.org" style="display:inline-block;background:linear-gradient(90deg,#3b82f6 0%,#8b5cf6 50%,#c084fc 100%);color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600;">Open the demo →</a></p>
            <p style="color:#666;font-size:14px;margin-top:32px;">— The GleeWorld team</p>
          </div>
        </div>
      `,
    });
  } catch (e) {
    errors.push(`inquirer-email: ${(e as Error).message}`);
  }

  // 4. Confirmation SMS to inquirer (only if a valid phone was provided)
  if (phone) {
    try {
      await sendTwilio(
        phone,
        `Hi ${name.split(" ")[0]}, thanks for your interest in GleeWorld. Kevin will reach out within one business day. Try the demo: https://demo.gleeworld.org`,
      );
    } catch (e) {
      errors.push(`inquirer-sms: ${(e as Error).message}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: errors.length === 0, errors: errors.length ? errors : undefined }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
