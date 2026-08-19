import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.25.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Connect ACCOUNT MANAGEMENT (accounts.create, accountLinks.create,
// createLoginLink) is barred to restricted keys outright — Stripe answers
// "the required permissions are not available for use by restricted keys",
// so no amount of ticking boxes on an rk_live_ key fixes it. Observed live
// 2026-08-08 as a StripePermissionError on acct_1TzQxD…
//
// STRIPE_SECRET_KEY is deliberately an rk_live_ restricted key across the
// platform. Rather than downgrade that for everyone, these two Connect
// functions prefer a dedicated full key and fall back to the restricted one
// so nothing breaks before it is set.
const stripe = new Stripe(
  Deno.env.get("STRIPE_CONNECT_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY")!,
  { apiVersion: "2024-06-20" },
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData } = await supa.auth.getUser(jwt);
  if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: partner } = await supa
    .from("gw_partners").select("*").eq("user_id", userData.user.id).maybeSingle();
  if (!partner || !partner.stripe_connect_id) {
    return new Response(JSON.stringify({ error: "no connect account" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const acct = await stripe.accounts.retrieve(partner.stripe_connect_id);
  const charges_enabled = !!acct.charges_enabled;
  const payouts_enabled = !!acct.payouts_enabled;
  // Active on CHARGES alone. New Connect accounts routinely sit in
  // Stripe's payout review (requirements.disabled_reason "other",
  // nothing currently_due) for days after onboarding completes — gating
  // on payouts too left Lion & Lamb looping through a Stripe flow that
  // had nothing left to collect. Sales work with charges enabled; funds
  // accumulate in the partner's Stripe balance until payouts clear.
  const nextStatus = charges_enabled
    ? "active" : (partner.status === "invited" ? "onboarding" : partner.status);
  const activatedAt = (nextStatus === "active" && partner.status !== "active") ? new Date().toISOString() : null;

  await supa.from("gw_partners").update({
    stripe_charges_enabled: charges_enabled,
    stripe_payouts_enabled: payouts_enabled,
    status: nextStatus,
    ...(activatedAt ? { activated_at: activatedAt } : {}),
  }).eq("id", partner.id);

  let express_dashboard_url: string | null = null;
  if (charges_enabled) {
    const loginLink = await stripe.accounts.createLoginLink(partner.stripe_connect_id);
    express_dashboard_url = loginLink.url;
  }

  return new Response(JSON.stringify({
    status: nextStatus, charges_enabled, payouts_enabled, express_dashboard_url,
  }), { headers: { ...corsHeaders, "content-type": "application/json" } });
});
