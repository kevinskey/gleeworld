// gw-send-signin-code — email a 6-digit sign-in code.
//
// Why a CODE and not a link:
//
// 1. The native app cannot receive links. ios/App/App/App.entitlements has no
//    associated-domains, there is no @capacitor/app URL listener, and `cap
//    sync` registers only push-notifications and status-bar. So an emailed
//    sign-in link opens Safari and the app never sees the session. The native
//    gate offers ONLY signInWithPassword — and an invited member has no
//    password, because invites are passwordless. Verified in the simulator
//    2026-10-03: such a member literally cannot get into the app.
//
// 2. A code is immune to the mail-scanner problem. Microsoft Defender fetched
//    a member's magic link 18 seconds after it was minted, completed the login
//    and took the session (see _shared/confirmLink.ts). A scanner can follow a
//    URL; it cannot type six digits into a form.
//
// GoTrue's admin/generate_link returns `email_otp` alongside the link, so this
// mints a magiclink, throws the link away, and emails only the code. The
// client then calls supabase.auth.verifyOtp({ email, token, type: 'email' }).
//
// Enumeration: like gw-send-password-reset, this ALWAYS returns success so an
// attacker cannot use it to discover which addresses exist. Do not "improve"
// the error handling to report unknown emails.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { linkField } from "../_shared/confirmLink.ts";
import { resolveTenantSlugFromOrigin, type TenantHostRow } from "../_shared/tenantHost.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_ORG_NAME = "GleeWorld";

// Same speed-bump shape as gw-send-password-reset: per-worker and in-memory,
// so it stops a double-tapped button, not a determined abuser.
const THROTTLE_MS = 60_000;
const lastSentAt = new Map<string, number>();

function throttled(email: string, now: number): boolean {
  const prev = lastSentAt.get(email);
  if (prev && now - prev < THROTTLE_MS) return true;
  lastSentAt.set(email, now);
  if (lastSentAt.size > 5_000) {
    for (const [k, t] of lastSentAt) {
      if (now - t > THROTTLE_MS) lastSentAt.delete(k);
    }
  }
  return false;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const ok = () =>
  new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as { email?: string; appOrigin?: string; tenantSlug?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "A valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (throttled(email, Date.now())) return ok();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRole);

    // Tenant branding, so the mail says the name the member recognises. The
    // app sends no origin (it runs on capacitor://localhost), so tenantSlug is
    // the usable hint there; on web the origin wins. Kept as two statements —
    // Deno rejects `??` mixed with `||` in one expression, at BOOT.
    const origin = (body.appOrigin || "").replace(/\/+$/, "");
    const slugFromOrigin = await resolveTenantSlugFromOrigin(origin, async () => {
      const { data } = await supabase.from("gw_tenants").select("slug, subdomain, custom_domain");
      return (data as TenantHostRow[] | null) ?? [];
    });
    const slug = slugFromOrigin || (body.tenantSlug || "").trim() || null;

    let orgName = DEFAULT_ORG_NAME;
    if (slug) {
      const { data: tenant } = await supabase
        .from("gw_tenants").select("id").eq("slug", slug).maybeSingle();
      if (tenant?.id) {
        const { data: brand } = await supabase
          .from("gw_branding_settings").select("org_name").eq("tenant_id", tenant.id).maybeSingle();
        const name = (brand?.org_name ?? "").replace(/[<>"]/g, "").trim();
        if (name) orgName = name;
      }
    }

    // Mint a magiclink purely to obtain its one-time code. The action_link is
    // deliberately discarded — emailing it is what lets a scanner spend the
    // token, and the app could not follow it anyway.
    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "magiclink", email }),
    });

    if (!linkRes.ok) {
      // Unknown address is the expected case and must be indistinguishable
      // from success. Log for ops, tell the caller nothing.
      const detail = await linkRes.text().catch(() => "");
      console.warn(`[gw-send-signin-code] generate_link ${linkRes.status}: ${detail}`);
      return ok();
    }

    const linkData = await linkRes.json();
    const code = linkField(linkData, "email_otp");
    if (!code) {
      console.error("[gw-send-signin-code] no email_otp in generate_link response");
      return ok();
    }

    const safeOrg = escapeHtml(orgName);
    const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
    const { error: emailErr } = await resend.emails.send({
      from: `${orgName} <noreply@gleeworld.org>`,
      to: [email],
      subject: `Your ${orgName} sign-in code`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;padding:24px;">
          <h2 style="color:#1a1a1a;margin:0 0 8px;">Your sign-in code</h2>
          <p style="margin:0 0 18px;color:#444;">Enter this code in the ${safeOrg} app to sign in.</p>
          <p style="font-size:34px;letter-spacing:9px;font-weight:700;margin:0 0 18px;color:#1a1a1a;">${escapeHtml(code)}</p>
          <p style="color:#666;font-size:13px;margin:0;">It expires shortly and can be used once. If you didn't ask for it, you can ignore this email — nobody can sign in without the code.</p>
        </div>
      `,
    });
    if (emailErr) console.error(`[gw-send-signin-code] send failed: ${emailErr.message ?? "unknown"}`);

    return ok();
  } catch (err) {
    console.error("[gw-send-signin-code] unexpected", err);
    // Still opaque to the caller.
    return ok();
  }
});
