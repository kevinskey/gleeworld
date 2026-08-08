// create-plan-checkout — start a Stripe subscription for a tenant-scope
// base plan (Director / Director+ / Institution — see gw_billing_plans
// scope='tenant').
//
// Body:
//   { planId: 'director_60', interval: 'monthly' | 'annual', success_url?, cancel_url? }
//   Legacy body shape { plan_id, billing_cycle } is still accepted for the
//   existing WorkspaceSettingsPage.tsx caller — see Task 7 of the
//   tiers-billing plan; the frontend body-shape migration wasn't in scope.
//
// Mirrors create-module-checkout but writes metadata `kind: 'plan'`
// so the webhook routes the event to gw_tenant_plans instead of
// gw_tenant_subscriptions.
//
// Price resolution (Task 7): prefer the Stripe lookup_key columns
// (stripe_lookup_key_monthly/annual, set by scripts/stripe-setup-tiers.mjs)
// resolved live via GET /v1/prices?lookup_keys[]=X — this way rotating a
// price in Stripe (transfer_lookup_key) doesn't require a DB write. Falls
// back to the stored stripe_price_id_monthly/annual column when the
// lookup_key is unset or Stripe returns no active price for it.

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

// Resolve a Stripe Price id by lookup_key. Stripe's list-prices filter
// requires bracket notation for the array param — lookup_keys[]=X, i.e.
// lookup_keys%5B%5D= once encoded (confirmed against Stripe's documented
// curl form in scripts/stripe-setup-tiers.mjs, commit c3268ae). Returns
// null (never throws) on any miss/failure so the caller can fall back to
// the plan's stored stripe_price_id_* column instead of hard-failing
// checkout on a transient Stripe list error.
async function findPriceIdByLookupKey(stripeKey: string, lookupKey: string): Promise<string | null> {
  try {
    const qs = `lookup_keys%5B%5D=${encodeURIComponent(lookupKey)}&limit=1&active=true`;
    const res = await fetch(`https://api.stripe.com/v1/prices?${qs}`, {
      headers: { "Authorization": `Bearer ${stripeKey}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const price = Array.isArray(json?.data) ? json.data[0] : null;
    return typeof price?.id === "string" ? price.id : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return err(405, "method_not_allowed");

  // The edge-functions container runs with VERIFY_JWT=false, so the gateway
  // does NOT check the token signature — we MUST verify it here. Without this
  // a forged JWT (any tenant_id / tenant_role, garbage signature) would be
  // trusted and let an attacker open a plan checkout against any tenant.
  // verifyClaims() calls admin.auth.getUser() before returning claims.
  const payload = await verifyClaims(req);
  if (!payload) return err(401, "invalid_token");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // deno-lint-ignore no-explicit-any
  const tenantId = (payload as any)?.tenant_id || (payload as any)?.app_metadata?.tenant_id;
  // deno-lint-ignore no-explicit-any
  const tenantRole = (payload as any)?.tenant_role || (payload as any)?.app_metadata?.tenant_role;
  if (!tenantId) return err(400, "no_tenant_in_jwt");
  // Only a tenant admin may change the org's base plan (matches the role gate
  // in create-module-checkout / create-course-checkout).
  if (!["owner", "admin", "super-admin", "super_admin"].includes(String(tenantRole))) {
    return err(403, "admin_only", "Only tenant admins can change the plan");
  }

  let body: {
    planId?: string; plan_id?: string;
    interval?: "monthly" | "annual"; billing_cycle?: "monthly" | "annual";
    success_url?: string; cancel_url?: string;
  };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  const planId = body.planId ?? body.plan_id;
  if (!planId) return err(400, "plan_id_required");
  const cycleRaw = body.interval ?? body.billing_cycle;
  const cycle: "monthly" | "annual" = cycleRaw === "annual" ? "annual" : "monthly";

  // Look up the plan (tenant-scope only — the Personal tier is
  // scope='user' and goes through create-personal-checkout instead) + the
  // tenant slug for the success/cancel redirect.
  const [{ data: plan, error: pErr }, { data: tenant }] = await Promise.all([
    admin.from("gw_billing_plans")
      .select("id, name, scope, stripe_price_id_monthly, stripe_price_id_annual, stripe_lookup_key_monthly, stripe_lookup_key_annual")
      .eq("id", planId)
      .eq("scope", "tenant")
      .eq("is_active", true)
      .single(),
    admin.from("gw_tenants").select("slug").eq("id", tenantId).single(),
  ]);
  if (pErr || !plan) return err(404, "plan_not_found", pErr?.message);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return err(500, "stripe_key_missing");

  const lookupKey = cycle === "annual" ? plan.stripe_lookup_key_annual : plan.stripe_lookup_key_monthly;
  const storedPriceId = cycle === "annual" ? plan.stripe_price_id_annual : plan.stripe_price_id_monthly;
  let priceId: string | null = lookupKey ? await findPriceIdByLookupKey(stripeKey, lookupKey) : null;
  if (!priceId) priceId = storedPriceId ?? null;
  if (!priceId) {
    return err(409, "no_stripe_price",
      `Plan ${plan.id} has no ${cycle} Stripe price (lookup_key ${lookupKey ?? "unset"} not found via Stripe and no stored stripe_price_id_${cycle}). Run scripts/stripe-setup-tiers.mjs or set the column manually.`);
  }

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("client_reference_id", String(tenantId));
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[tenant_id]", String(tenantId));
  params.set("metadata[tenant_slug]", tenant?.slug ?? "");
  params.set("metadata[plan_id]", plan.id);
  params.set("metadata[billing_cycle]", cycle);
  params.set("metadata[kind]", "plan");
  params.set("subscription_data[metadata][tenant_id]", String(tenantId));
  params.set("subscription_data[metadata][plan_id]", plan.id);
  params.set("subscription_data[metadata][billing_cycle]", cycle);
  params.set("subscription_data[metadata][kind]", "plan");
  const slug = tenant?.slug ?? "";
  params.set("success_url", body.success_url ?? `https://${slug ? slug + "." : ""}gleeworld.org/dashboard/workspace?tab=plan&activated=${plan.id}`);
  params.set("cancel_url",  body.cancel_url  ?? `https://${slug ? slug + "." : ""}gleeworld.org/dashboard/workspace?tab=plan&cancelled=${plan.id}`);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return err(502, "stripe_checkout_failed", `${res.status}: ${t.slice(0, 300)}`);
  }
  const session = await res.json();
  return new Response(JSON.stringify({ ok: true, url: session.url, id: session.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
