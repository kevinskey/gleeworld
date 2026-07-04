// create-personal-checkout — start a Stripe subscription for the
// individual "Personal" plan (gw_billing_plans.scope='user').
//
// Body:
//   { planId?: 'personal', interval?: 'monthly' | 'annual', success_url?, cancel_url? }
//
// Sibling of create-plan-checkout, but the payer is the CALLER (resolved
// from the verified JWT), not a tenant — there is no tenant_id/tenant_role
// gate here, since "can this user buy their own Personal plan" only needs
// a valid session, not an admin role. Writes metadata `kind: 'personal'`
// + `user_id` so the webhook upserts gw_user_plans instead of
// gw_tenant_plans (see Task 7 of the tiers-billing plan).
//
// Price resolution mirrors create-plan-checkout: prefer the Stripe
// lookup_key columns (stripe_lookup_key_monthly/annual, set by
// scripts/stripe-setup-tiers.mjs) resolved live via
// GET /v1/prices?lookup_keys[]=X, falling back to the stored
// stripe_price_id_monthly/annual column when the lookup_key is unset or
// Stripe returns no active price for it.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return err(401, "unauthorized");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Same verification approach as create-plan-checkout: the edge-functions
  // container runs with VERIFY_JWT=false, so the gateway does NOT check the
  // token signature — we MUST verify it here. Without this a forged JWT
  // would let an attacker open a Personal-plan checkout billed to (and
  // fulfilled for) an arbitrary user_id.
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return err(401, "invalid_token");

  // Signature is now verified — the user id/email on the returned user
  // object are trustworthy. No tenant_id/tenant_role claim is needed: the
  // Personal plan belongs to this individual, not to a gw_tenants row.
  const userId = userData.user.id;
  const userEmail = userData.user.email ?? undefined;

  let body: {
    planId?: string; plan_id?: string;
    interval?: "monthly" | "annual"; billing_cycle?: "monthly" | "annual";
    success_url?: string; cancel_url?: string;
  };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  // 'personal' is currently the only scope='user' row in gw_billing_plans;
  // default to it so callers can omit planId entirely, but still validate
  // whatever is passed against scope='user' below (future-proof if a
  // second user-scope tier is ever added).
  const planId = body.planId ?? body.plan_id ?? "personal";
  const cycleRaw = body.interval ?? body.billing_cycle;
  const cycle: "monthly" | "annual" = cycleRaw === "annual" ? "annual" : "monthly";

  const { data: plan, error: pErr } = await admin
    .from("gw_billing_plans")
    .select("id, name, scope, stripe_price_id_monthly, stripe_price_id_annual, stripe_lookup_key_monthly, stripe_lookup_key_annual")
    .eq("id", planId)
    .eq("scope", "user")
    .eq("is_active", true)
    .single();
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

  // Reuse an existing Stripe customer id if this user already has (or
  // previously had) a Personal plan row, so repeat/renewal checkouts don't
  // create duplicate Stripe customers for the same person.
  const { data: existing } = await admin
    .from("gw_user_plans")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("client_reference_id", userId);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[user_id]", userId);
  params.set("metadata[plan_id]", plan.id);
  params.set("metadata[billing_cycle]", cycle);
  params.set("metadata[kind]", "personal");
  params.set("subscription_data[metadata][user_id]", userId);
  params.set("subscription_data[metadata][plan_id]", plan.id);
  params.set("subscription_data[metadata][billing_cycle]", cycle);
  params.set("subscription_data[metadata][kind]", "personal");
  // No tenant subdomain for a Personal plan — success/cancel land on the
  // main app. Placeholder route pending the frontend CTA wiring (deferred
  // out of Task 7's scope, same as the landing page's payment links);
  // callers can override with success_url/cancel_url in the body.
  params.set("success_url", body.success_url ?? `https://gleeworld.org/dashboard/workspace?tab=plan&activated=${plan.id}`);
  params.set("cancel_url",  body.cancel_url  ?? `https://gleeworld.org/dashboard/workspace?tab=plan&cancelled=${plan.id}`);
  if (existing?.stripe_customer_id) {
    params.set("customer", existing.stripe_customer_id);
  } else if (userEmail) {
    params.set("customer_email", userEmail);
  }

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
