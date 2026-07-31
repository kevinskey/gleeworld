import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.25.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Webhook handler — no CORS needed (server-to-server, not browser-originated)
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

serve(async (req) => {
  // Stripe webhooks are POST only; no preflight
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Must read raw body before any parsing — required for HMAC verification
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (e) {
    console.error("Webhook signature verification failed:", (e as Error).message);
    return new Response(`Webhook signature error: ${(e as Error).message}`, { status: 400 });
  }

  // Only handle checkout.session.completed — ignore everything else gracefully
  if (event.type !== "checkout.session.completed") {
    return new Response("Event type ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const md = session.metadata ?? {};

  // Guard: only process fee payments (metadata set by create-fee-payment)
  if (!md.student_fee_id) {
    return new Response("Not a fee payment session — no student_fee_id in metadata", { status: 200 });
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  const amountPaid = (session.amount_total ?? 0) / 100;

  // ── Idempotency check ──────────────────────────────────────────────────────
  // If this payment_intent is already recorded on the fee row, skip processing.
  // Stripe may deliver the same event more than once (at-least-once delivery).
  if (paymentIntentId) {
    const { data: existing } = await admin
      .from("gw_student_fees")
      .select("id")
      .eq("id", md.student_fee_id)
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (existing) {
      console.log(`Payment ${paymentIntentId} already recorded for fee ${md.student_fee_id} — skipping`);
      return new Response("Already recorded (idempotent)", { status: 200 });
    }
  }

  // ── Call record_fee_payment RPC (Task 6) ───────────────────────────────────
  const { error: rpcError } = await admin.rpc("record_fee_payment", {
    p_fee_id: md.student_fee_id,
    p_method: "stripe",
    p_amount: amountPaid,
    p_reference: paymentIntentId ?? null,
  });

  if (rpcError) {
    console.error("record_fee_payment RPC error:", rpcError.message);
    return new Response(`RPC error: ${rpcError.message}`, { status: 500 });
  }

  // ── Persist stripe_payment_intent_id on the fee row ───────────────────────
  // record_fee_payment updates status/amounts but does not touch this column.
  if (paymentIntentId) {
    await admin
      .from("gw_student_fees")
      .update({ stripe_payment_intent_id: paymentIntentId })
      .eq("id", md.student_fee_id);
  }

  // ── Installment: mark the specific installment row paid ───────────────────
  if (md.installment_id) {
    const { error: instError } = await admin
      .from("gw_fee_plan_installments")
      .update({
        status: "paid",
        paid_amount: amountPaid,
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId ?? null,
      })
      .eq("id", md.installment_id);

    if (instError) {
      // Log but don't fail — the fee itself is already marked paid
      console.error("Failed to update installment row:", instError.message);
    }
  }

  console.log(
    `Fee ${md.student_fee_id} marked paid via Stripe` +
      (md.installment_id ? ` (installment ${md.installment_id})` : ""),
  );

  return new Response("ok", { status: 200 });
});
