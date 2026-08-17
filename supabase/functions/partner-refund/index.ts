import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Admin-only refund of ONE partner-store order item (item = the refund
// unit; one item = one score = one My Music entitlement). Flow:
//   Stripe refund (destination charge: reverse the partner transfer and
//   the platform fee proportionally) → stamp refunded_at/stripe_refund_id
//   → revoke the buyer's entitlement (My Music row + stamped file + seat
//   shares) → derive order status (refunded / partial_refund).
// Refund math mirrors src/lib/partner/refunds.ts — keep in sync.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return j({ error: "unauthorized" }, 401);

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData } = await supa.auth.getUser(jwt);
  if (!userData.user) return j({ error: "unauthorized" }, 401);

  // Same admin gate as partner-invite-send.
  const { data: prof } = await supa
    .from("gw_profiles")
    .select("is_admin,is_super_admin")
    .eq("user_id", userData.user.id)
    .single();
  if (!prof || (!prof.is_admin && !prof.is_super_admin)) {
    return j({ error: "admin only" }, 403);
  }

  const { order_item_id } = await req.json().catch(() => ({}));
  if (!order_item_id) return j({ error: "order_item_id required" }, 400);

  const { data: item } = await supa
    .from("gw_partner_order_items")
    .select("id, order_id, price_cents, quantity, refunded_at, watermarked_storage_path")
    .eq("id", order_item_id)
    .single();
  if (!item) return j({ error: "item not found" }, 404);
  if (item.refunded_at) return j({ error: "item already refunded" }, 409);

  const { data: order } = await supa
    .from("gw_partner_orders")
    .select("id, buyer_user_id, status, stripe_payment_intent_id")
    .eq("id", item.order_id)
    .single();
  if (!order) return j({ error: "order not found" }, 404);
  if (order.status !== "paid" && order.status !== "partial_refund") {
    return j({ error: `order is ${order.status}, not refundable` }, 409);
  }
  if (!order.stripe_payment_intent_id) {
    // Synthetic/test orders have no payment intent — nothing to refund.
    return j({ error: "order has no Stripe payment intent" }, 400);
  }

  // Mirrors itemRefundAmountCents: unit price × seats.
  const amountCents = item.price_cents * Math.max(1, Number(item.quantity ?? 1));

  // Destination charge: reverse_transfer claws the partner's share back;
  // refund_application_fee returns the platform's cut. Both prorate for
  // partial (per-item) refunds of a multi-item order.
  const stripeRes = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      payment_intent: order.stripe_payment_intent_id,
      amount: String(amountCents),
      refund_application_fee: "true",
      reverse_transfer: "true",
      "metadata[order_item_id]": item.id,
    }),
  });
  const refund = await stripeRes.json().catch(() => null);
  if (!stripeRes.ok || !refund?.id) {
    console.error("[partner-refund] stripe refund failed", stripeRes.status, refund?.error?.message);
    return j({ error: refund?.error?.message ?? "Stripe refund failed" }, 502);
  }

  const nowIso = new Date().toISOString();
  const { error: itemErr } = await supa
    .from("gw_partner_order_items")
    .update({ refunded_at: nowIso, stripe_refund_id: refund.id })
    .eq("id", item.id);
  if (itemErr) {
    // Money already moved — surface loudly; the admin can re-run (Stripe
    // would then 400 on the already-refunded intent, but the DB stamp is
    // what re-running is for).
    console.error("[partner-refund] refund succeeded but item update failed", itemErr.message);
    return j({ error: `refunded in Stripe (${refund.id}) but DB update failed: ${itemErr.message}` }, 500);
  }

  // Revoke the entitlement: seat shares die, the buyer's My Music row and
  // stamped file go away. Device copies saved via the offline vault are out
  // of reach — accepted (spec decision).
  await supa.from("gw_partner_score_shares").delete().eq("order_item_id", item.id);
  if (item.watermarked_storage_path) {
    await supa
      .from("gw_personal_scores")
      .delete()
      .eq("user_id", order.buyer_user_id)
      .eq("storage_path", item.watermarked_storage_path)
      .eq("source", "purchase");
    const { error: rmErr } = await supa.storage
      .from("personal-scores")
      .remove([item.watermarked_storage_path]);
    if (rmErr) console.error("[partner-refund] stamped file removal failed", rmErr.message);
  }

  // Derive order status from item states (mirrors deriveOrderStatus).
  const { data: siblings } = await supa
    .from("gw_partner_order_items")
    .select("refunded_at")
    .eq("order_id", order.id);
  const all = siblings ?? [];
  const refundedCount = all.filter((s) => s.refunded_at != null).length;
  const orderStatus =
    all.length > 0 && refundedCount === all.length ? "refunded" : "partial_refund";
  await supa
    .from("gw_partner_orders")
    .update({
      status: orderStatus,
      ...(orderStatus === "refunded" ? { refunded_at: nowIso } : {}),
    })
    .eq("id", order.id);

  return j({
    refund_id: refund.id,
    amount_cents: amountCents,
    order_status: orderStatus,
  });
});
