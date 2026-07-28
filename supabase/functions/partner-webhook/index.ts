import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.25.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET_PARTNER") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`sig verify failed: ${e instanceof Error ? e.message : String(e)}`, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // v1 handles only the paid event. Ignore refunds etc. (Phase 3).
    return new Response("ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;
  const buyerUserId = session.metadata?.buyer_user_id;
  const partnerId = session.metadata?.partner_id;
  const cartScoreIds = (session.metadata?.cart_score_ids ?? "").split(",").filter(Boolean);
  if (!orderId || !buyerUserId || !partnerId || cartScoreIds.length === 0) {
    return new Response("missing metadata", { status: 400 });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Load scores for pricing.
  const { data: scores, error: scoresErr } = await supa
    .from("gw_partner_scores")
    .select("id, price_cents, title, master_storage_path")
    .in("id", cartScoreIds);
  if (scoresErr || !scores || scores.length !== cartScoreIds.length) {
    return new Response("scores missing", { status: 500 });
  }

  // Mark order paid.
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent : session.payment_intent?.id;
  await supa.from("gw_partner_orders").update({
    status: "paid",
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: paymentIntentId ?? null,
  }).eq("id", orderId);

  // Fulfill each item.
  for (const score of scores) {
    const price = score.price_cents;
    const platformFee = Math.floor(price / 2);
    const payout = price - platformFee;

    // Idempotency: skip if item already exists for (order_id, partner_score_id).
    const { data: existing } = await supa
      .from("gw_partner_order_items")
      .select("id")
      .eq("order_id", orderId)
      .eq("partner_score_id", score.id)
      .maybeSingle();
    if (existing) continue;

    // Entitlement row.
    const downloadToken = crypto.randomUUID().replace(/-/g, "");
    const { data: ent } = await supa
      .from("gw_store_entitlements")
      .insert({ buyer_user_id: buyerUserId, download_token: downloadToken })
      .select("id")
      .single();

    // Order item.
    const { data: item } = await supa
      .from("gw_partner_order_items")
      .insert({
        order_id: orderId,
        partner_score_id: score.id,
        partner_id: partnerId,
        price_cents: price,
        platform_fee_cents: platformFee,
        partner_payout_cents: payout,
        entitlement_id: ent?.id ?? null,
      })
      .select("id")
      .single();
    if (!item) continue;

    // Trigger watermarking asynchronously — Stripe expects us to return
    // 200 within 20s. If watermarking is slow, the buyer's Thanks page
    // polls; when watermarked_storage_path fills, the download unlocks.
    fetch(`${SUPABASE_URL}/functions/v1/partner-watermark`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({ order_item_id: item.id }),
    }).catch(() => {});

    // Personal music row so it appears in My Music. storage_path is filled
    // later by the watermark fn's update path? No — the watermark fn writes
    // to gw_partner_order_items, not gw_personal_scores. We write personal
    // score with external_url=null and storage_path pointing at the
    // eventual watermarked path (predictable).
    const watermarkedPath = `${buyerUserId}/store/${item.id}.pdf`;
    await supa.from("gw_personal_scores").insert({
      user_id: buyerUserId,
      title: score.title,
      source: "purchase",
      entitlement_id: ent?.id ?? null,
      storage_path: watermarkedPath, // populated once watermark finishes
    });
  }

  return new Response("ok", { status: 200 });
});
