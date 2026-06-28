// create-plan-checkout — start a Stripe subscription for a base plan
// (Ensemble / Studio / Conservatory / University).
//
// Body:
//   { plan_id: 'studio', billing_cycle: 'monthly' | 'annual', success_url?, cancel_url? }
//
// Mirrors create-module-checkout but writes metadata `kind: 'plan'`
// so the webhook routes the event to gw_tenant_plans instead of
// gw_tenant_subscriptions.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const part = jwt.split(".")[1];
    const padded = part + "===".slice((part.length + 3) % 4);
    return JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
}

function err(status: number, code: string, detail?: string) {
  return new Response(JSON.stringify({ error: code, detail }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return err(405, "method_not_allowed");

  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return err(401, "unauthorized");

  const payload = decodeJwtPayload(jwt);
  // deno-lint-ignore no-explicit-any
  const tenantId = (payload as any)?.tenant_id || (payload as any)?.app_metadata?.tenant_id;
  if (!tenantId) return err(400, "no_tenant_in_jwt");

  let body: { plan_id?: string; billing_cycle?: "monthly" | "annual"; success_url?: string; cancel_url?: string };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.plan_id) return err(400, "plan_id_required");
  const cycle: "monthly" | "annual" = body.billing_cycle === "annual" ? "annual" : "monthly";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Look up the plan + tenant slug.
  const [{ data: plan, error: pErr }, { data: tenant }] = await Promise.all([
    admin.from("gw_billing_plans").select("id, name, stripe_price_id_monthly, stripe_price_id_annual").eq("id", body.plan_id).eq("is_active", true).single(),
    admin.from("gw_tenants").select("slug").eq("id", tenantId).single(),
  ]);
  if (pErr || !plan) return err(404, "plan_not_found", pErr?.message);

  const priceId = cycle === "annual" ? plan.stripe_price_id_annual : plan.stripe_price_id_monthly;
  if (!priceId) {
    return err(409, "no_stripe_price",
      `Plan ${plan.id} has no ${cycle} Stripe price configured. Create one in Stripe Dashboard and run UPDATE gw_billing_plans SET stripe_price_id_${cycle} = 'price_…' WHERE id = '${plan.id}'.`);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return err(500, "stripe_key_missing");

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
