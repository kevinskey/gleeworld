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
  // Seat licensing: aligned 1:1 with cart_score_ids (see checkout fn).
  const cartQuantities = String(session.metadata?.cart_quantities ?? "")
    .split(",").map((q: string) => Math.max(1, Math.trunc(Number(q)) || 1));
  const qtyByScore = new Map(cartScoreIds.map((id: string, i: number) => [id, cartQuantities[i] ?? 1]));
  // Not a partner-store checkout.
  //
  // Stripe fans checkout.session.completed out to EVERY endpoint subscribed
  // to it, and this account has five. So the fees flow, the main store,
  // VIP454 and T-Shirt Brothers all land here, none of them carrying partner
  // metadata. Refusing them is right; refusing them with a 400 was not —
  // that tells Stripe the delivery FAILED, so it retries, counts the failure,
  // and eventually emails "webhook delivery issues" (Kevin, 2026-08-20:
  // every real delivery was a 400 and the endpoint looked broken).
  //
  // "This event isn't mine" is a successful delivery. 200, like the
  // event-type check above.
  const isPartnerCheckout = Boolean(orderId || buyerUserId || partnerId || cartScoreIds.length > 0);
  if (!isPartnerCheckout) {
    return new Response("not a partner checkout", { status: 200 });
  }

  // Looks like a partner checkout but is missing pieces — that IS a real
  // failure (partner-checkout-create should always set all four), so it
  // still 400s and still retries. Logged with the session id, because a
  // silent 200 here would hide a broken checkout path.
  if (!orderId || !buyerUserId || !partnerId || cartScoreIds.length === 0) {
    console.error("[partner-webhook] partial partner metadata", {
      session: session.id,
      has: { orderId: !!orderId, buyerUserId: !!buyerUserId, partnerId: !!partnerId, scores: cartScoreIds.length },
    });
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
    const qty = qtyByScore.get(score.id) ?? 1;
    const lineTotal = score.price_cents * qty;
    const price = score.price_cents; // unit price — quantity is its own column
    const platformFee = Math.floor(lineTotal / 2);
    const payout = lineTotal - platformFee;

    // Idempotency: skip if item already exists for (order_id, partner_score_id).
    const { data: existing } = await supa
      .from("gw_partner_order_items")
      .select("id")
      .eq("order_id", orderId)
      .eq("partner_score_id", score.id)
      .maybeSingle();
    if (existing) continue;

    // Order item (upsert as safety net against Stripe retries).
    const { data: item } = await supa
      .from("gw_partner_order_items")
      .upsert({
        order_id: orderId,
        partner_score_id: score.id,
        partner_id: partnerId,
        price_cents: price,
        quantity: qty,
        platform_fee_cents: platformFee,
        partner_payout_cents: payout,
        entitlement_id: null,
      }, { onConflict: 'order_id,partner_score_id' })
      .select("id")
      .single();
    if (!item) continue;

    // Trigger watermarking. The watermark fn uploads the stamped PDF and then
    // inserts the gw_personal_scores row so it only appears once the file
    // actually exists. Stripe allows 20s; await gives us a chance to catch
    // failures without a fire-and-forget silent miss.
    const wmRes = await fetch(`${SUPABASE_URL}/functions/v1/partner-watermark`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({ order_item_id: item.id }),
    }).catch(() => null);

    if (!wmRes?.ok) {
      // Watermark failed — skip personal-scores insert. The buyer's ThanksPage
      // polls watermarked_storage_path; reconciliation happens on next visit.
      continue;
    }
  }

  return new Response("ok", { status: 200 });
});
