// gw-send-password-reset — tenant-branded password reset email.
//
// Why this exists instead of supabase.auth.resetPasswordForEmail():
// GoTrue owns exactly ONE sender name (SMTP_SENDER_NAME, currently
// "GleeWorld") and ONE set of email templates for the whole instance. There
// is no per-tenant hook. So a student at Yo-Doc asking their own site for a
// reset got an email from "GleeWorld" with stock GoTrue copy — a brand they
// have never heard of, which reads like phishing and gets ignored.
//
// So we mint the recovery link ourselves via GoTrue's admin generate_link
// (which does NOT send mail) and deliver it through Resend with the tenant's
// own name, exactly the way gw-invite-student already sends invites.
//
// Two consequences of bypassing /auth/v1/recover that callers should know:
//   • GoTrue's built-in per-IP rate limiting no longer applies. The in-memory
//     throttle below is a speed bump, not a real limiter — see THROTTLE_MS.
//   • GoTrue's enumeration protection no longer applies either, so this
//     function must ALWAYS return success regardless of whether the address
//     exists. Do not "improve" the error handling to report unknown emails.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import {
  resolveTenantSlugFromOrigin,
  type TenantHostRow,
} from "../_shared/tenantHost.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_ORG_NAME = "GleeWorld";

// Per-instance, per-email cooldown. This is deliberately modest: it stops a
// loop or a double-clicked button, not a distributed abuser. Deno edge
// workers are recycled and there may be several in flight, so this map is
// neither shared nor durable. A real limit belongs in front of the function.
const THROTTLE_MS = 60_000;
const lastSentAt = new Map<string, number>();

function throttled(email: string, now: number): boolean {
  const prev = lastSentAt.get(email);
  if (prev && now - prev < THROTTLE_MS) return true;
  lastSentAt.set(email, now);
  // Keep the map from growing without bound on a long-lived worker.
  if (lastSentAt.size > 5_000) {
    for (const [k, t] of lastSentAt) {
      if (now - t > THROTTLE_MS) lastSentAt.delete(k);
    }
  }
  return false;
}

interface ResetPayload {
  email: string;
  appOrigin?: string;  // window.location.origin of the site they asked from
  tenantSlug?: string; // window.__TENANT_CONFIG__.tenant, when the client knows it
}

// Always the same body, whatever happened. See the enumeration note above.
const ok = () =>
  new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ResetPayload;
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

    // 1. Which tenant is this person asking from?
    //
    // Trust the client's tenantSlug only as a hint — appOrigin is what GoTrue
    // will actually validate against its redirect allowlist, so resolving from
    // the origin keeps the branding and the destination consistent.
    const origin = (body.appOrigin || "").replace(/\/+$/, "");
    // Kept as two statements on purpose: Deno rejects `??` mixed with `||`
    // in one expression ("requires parens"), and it rejects it at BOOT, so
    // the whole function 500s on every request rather than failing a test.
    const slugFromOrigin = await resolveTenantSlugFromOrigin(origin, async () => {
      const { data } = await supabase
        .from("gw_tenants")
        .select("slug, subdomain, custom_domain");
      return (data as TenantHostRow[] | null) ?? [];
    });
    const slug = slugFromOrigin || (body.tenantSlug || "").trim() || null;

    // 2. The tenant's display name. gw_branding_settings.org_name is the same
    //    source gw-invite-student uses, so invite and reset agree.
    let orgName = DEFAULT_ORG_NAME;
    if (slug) {
      const { data: tenant } = await supabase
        .from("gw_tenants")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (tenant?.id) {
        const { data: brand } = await supabase
          .from("gw_branding_settings")
          .select("org_name")
          .eq("tenant_id", tenant.id)
          .maybeSingle();
        const name = (brand?.org_name ?? "").replace(/[<>"]/g, "").trim();
        if (name) orgName = name;
      }
    }

    // 3. Mint the recovery link. Admin generate_link does not send mail.
    //
    // redirect_to MUST be top-level, not nested under `options` — GoTrue
    // silently falls back to SITE_URL otherwise, which is the same trap
    // documented at length in gw-invite-student. It must also be on GoTrue's
    // URI_ALLOW_LIST or you get the identical silent fallback; every tenant
    // custom_domain needs an entry there.
    const redirectTo = origin ? `${origin}/reset-password` : undefined;
    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "recovery",
        email,
        ...(redirectTo ? { redirect_to: redirectTo } : {}),
      }),
    });

    if (!linkRes.ok) {
      // Unknown address is the expected case here and must look identical to
      // success from the outside. Log it for ops, tell the caller nothing.
      const detail = await linkRes.text().catch(() => "");
      console.warn(`[gw-send-password-reset] generate_link ${linkRes.status}: ${detail}`);
      return ok();
    }

    const linkData = await linkRes.json();
    const actionLink: string | undefined =
      linkData?.action_link ?? linkData?.properties?.action_link;
    if (!actionLink) {
      console.error("[gw-send-password-reset] no action_link in generate_link response");
      return ok();
    }

    // 4. Send it as the tenant. The address stays on our Resend-verified
    //    gleeworld.org domain; only the display name is the tenant's.
    const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
    const safeOrg = escapeHtml(orgName);
    const { error: emailErr } = await resend.emails.send({
      from: `${orgName} <noreply@gleeworld.org>`,
      to: [email],
      subject: `Reset your ${orgName} password`,
      html: `
      <div style="font-family:sans-serif;max-width:600px;padding:24px;">
        <h2 style="color:#1a1a1a;">Reset your ${safeOrg} password</h2>
        <p>We got a request to reset the password for this address. Click below to choose a new one.</p>
        <p><a href="${actionLink}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reset my password</a></p>
        <p style="color:#666;font-size:13px;">If the button doesn't work, copy and paste this link: ${actionLink}</p>
        <p style="color:#666;font-size:13px;">If you didn't ask for this, you can ignore this email — your password won't change.</p>
      </div>
    `,
    });
    if (emailErr) {
      console.error(`[gw-send-password-reset] resend: ${emailErr.message ?? "unknown"}`);
    }

    return ok();
  } catch (e) {
    // Even an unexpected failure must not become an enumeration oracle.
    console.error("[gw-send-password-reset]", e);
    return ok();
  }
});

function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
