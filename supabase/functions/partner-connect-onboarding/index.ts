import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.25.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const APP_HOST = Deno.env.get("APP_HOST") ?? "https://gleeworld.org";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData } = await supa.auth.getUser(jwt);
  if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: partner, error: pErr } = await supa
    .from("gw_partners").select("*").eq("user_id", userData.user.id).maybeSingle();
  if (pErr || !partner) return new Response(JSON.stringify({ error: "not a partner" }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });

  let acct_id = partner.stripe_connect_id;
  if (!acct_id) {
    const acct = await stripe.accounts.create({
      type: "express",
      email: partner.contact_email ?? userData.user.email ?? undefined,
      metadata: { partner_id: partner.id, user_id: userData.user.id },
    });
    acct_id = acct.id;
    await supa.from("gw_partners").update({ stripe_connect_id: acct_id }).eq("id", partner.id);
  }

  const link = await stripe.accountLinks.create({
    account: acct_id,
    refresh_url: `${APP_HOST}/partner?stripe=refresh`,
    return_url: `${APP_HOST}/partner?stripe=done`,
    type: "account_onboarding",
  });

  return new Response(JSON.stringify({ onboarding_url: link.url }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
