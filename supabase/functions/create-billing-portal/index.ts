// create-billing-portal — open a Stripe Customer Portal session so a payer
// can self-manage their subscription: switch Director ↔ Director+ (portal
// config bpc_1U0PDP… allows those two products with proration), change the
// card, see invoices, or cancel.
//
// Body:
//   { kind?: 'tenant' | 'personal', tenant_slug?: string, return_url?: string }
//
// kind 'tenant' (default): manage the TARGET workspace's base-plan
// subscription. Same auth model as create-plan-checkout (PR #714): the slug
// names the tenant; the caller needs an admin-tier gw_tenant_members row in
// THAT tenant or gw_profiles.is_super_admin — JWT tenant claims describe the
// caller's HOME tenant and count only when they match the target.
//
// kind 'personal': manage the CALLER's own gw_user_plans subscription; only
// a valid session is required.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyClaims } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function err(status: number, code: string, detail?: string) {
  return new Response(JSON.stringify({ error: code, detail }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return err(405, "method_not_allowed");

  const payload = await verifyClaims(req);
  if (!payload) return err(401, "invalid_token");
  // deno-lint-ignore no-explicit-any
  const userId = (payload as any)?.sub as string | undefined;
  if (!userId) return err(401, "invalid_token");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let body: { kind?: "tenant" | "personal"; tenant_slug?: string; return_url?: string };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  const kind = body.kind === "personal" ? "personal" : "tenant";

  let customerId: string | null = null;
  let returnUrl = body.return_url ?? "";

  if (kind === "personal") {
    const { data: plan } = await admin.from("gw_user_plans")
      .select("stripe_customer_id").eq("user_id", userId).maybeSingle();
    customerId = plan?.stripe_customer_id ?? null;
    if (!returnUrl) returnUrl = "https://gleeworld.org/dashboard";
  } else {
    const slug = String(body.tenant_slug ?? req.headers.get("x-tenant-slug") ?? "").trim();
    if (!slug) return err(400, "no_tenant", "Pass tenant_slug (or x-tenant-slug header)");
    const { data: tenant } = await admin.from("gw_tenants").select("id, slug").eq("slug", slug).maybeSingle();
    if (!tenant?.id) return err(404, "tenant_not_found", slug);

    // deno-lint-ignore no-explicit-any
    const claimTenant = (payload as any)?.tenant_id || (payload as any)?.app_metadata?.tenant_id;
    // deno-lint-ignore no-explicit-any
    let tenantRole = claimTenant === tenant.id
      // deno-lint-ignore no-explicit-any
      ? ((payload as any)?.tenant_role || (payload as any)?.app_metadata?.tenant_role || "")
      : "";
    if (!tenantRole) {
      const [{ data: member }, { data: profile }] = await Promise.all([
        admin.from("gw_tenant_members").select("role")
          .eq("tenant_id", tenant.id).eq("user_id", userId).maybeSingle(),
        admin.from("gw_profiles").select("is_super_admin")
          .eq("user_id", userId).maybeSingle(),
      ]);
      tenantRole = profile?.is_super_admin ? "super_admin" : (member?.role ?? "");
    }
    if (!["owner", "admin", "director", "super-admin", "super_admin"].includes(String(tenantRole))) {
      return err(403, "admin_only", "Only tenant admins can manage billing");
    }

    const { data: plan } = await admin.from("gw_tenant_plans")
      .select("stripe_customer_id").eq("tenant_id", tenant.id).maybeSingle();
    customerId = plan?.stripe_customer_id ?? null;
    if (!returnUrl) returnUrl = `https://${tenant.slug}.gleeworld.org/dashboard/workspace?tab=plan`;
  }

  if (!customerId) {
    return err(409, "no_stripe_customer",
      "No billing record yet — complete a plan checkout first.");
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return err(500, "stripe_key_missing");

  const params = new URLSearchParams();
  params.set("customer", customerId);
  params.set("return_url", returnUrl);
  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return err(502, "portal_failed", `${res.status}: ${t.slice(0, 300)}`);
  }
  const session = await res.json();
  return new Response(JSON.stringify({ ok: true, url: session.url }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
