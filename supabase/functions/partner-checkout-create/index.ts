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

interface Item { partner_score_id: string; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData } = await supa.auth.getUser(jwt);
  if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const body = await req.json().catch(() => ({}));
  const items: Item[] = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return new Response(JSON.stringify({ error: "cart empty" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

  // Load scores + partner in one query.
  const { data: scores, error: scoresErr } = await supa
    .from("gw_partner_scores")
    .select("id, title, price_cents, partner_id, status")
    .in("id", items.map(i => i.partner_score_id));
  if (scoresErr || !scores || scores.length !== items.length) {
    return new Response(JSON.stringify({ error: "one or more scores not found" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  const published = scores.filter(s => s.status === "published");
  if (published.length !== scores.length) {
    return new Response(JSON.stringify({ error: "one or more scores are not for sale" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  const partnerIds = new Set(published.map(s => s.partner_id));
  if (partnerIds.size > 1) {
    return new Response(JSON.stringify({ error: "cart contains multiple partners; complete one purchase at a time" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  const partnerId = [...partnerIds][0];

  const { data: partner } = await supa
    .from("gw_partners").select("id, stripe_connect_id, stripe_charges_enabled, status").eq("id", partnerId).single();
  if (!partner || partner.status !== "active" || !partner.stripe_charges_enabled || !partner.stripe_connect_id) {
    return new Response(JSON.stringify({ error: "partner not currently accepting purchases" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const subtotal_cents = published.reduce((s, x) => s + x.price_cents, 0);
  const platform_fee_cents = Math.floor(subtotal_cents / 2);
  const cart_score_ids = published.map(s => s.id).join(",");

  // Insert order (pending).
  const { data: order, error: orderErr } = await supa
    .from("gw_partner_orders")
    .insert({
      buyer_user_id: userData.user.id,
      subtotal_cents,
      platform_fee_cents,
      currency: "USD",
      status: "pending",
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "could not create order" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  // Create Stripe Checkout session.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: published.map((s) => ({
      price_data: {
        currency: "usd",
        product_data: { name: s.title },
        unit_amount: s.price_cents,
      },
      quantity: 1,
    })),
    payment_intent_data: {
      application_fee_amount: platform_fee_cents,
      transfer_data: { destination: partner.stripe_connect_id },
      metadata: { order_id: order.id },
    },
    metadata: {
      order_id: order.id,
      partner_id: partnerId,
      buyer_user_id: userData.user.id,
      cart_score_ids,
    },
    success_url: `${APP_HOST}/store/thanks?order=${order.id}`,
    cancel_url: `${APP_HOST}/store`,
    customer_email: userData.user.email ?? undefined,
  });

  await supa.from("gw_partner_orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);

  return new Response(JSON.stringify({ url: session.url, order_id: order.id }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
