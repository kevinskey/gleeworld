import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err: any) {
        logStep("Webhook signature verification failed", { error: err.message });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Parse without verification (for testing)
      event = JSON.parse(body);
      logStep("Webhook parsed without signature verification");
    }

    logStep("Processing event", { type: event.type, id: event.id });

    // Store webhook event for audit
    await supabase.from('gw_webhook_events').insert({
      provider: 'stripe',
      event_id: event.id,
      event_type: event.type,
      payload: event,
      status: 'processing'
    });

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(supabase, stripe, paymentIntent);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(supabase, charge);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(supabase, dispute);
        break;
      }

      case 'charge.dispute.updated': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeUpdated(supabase, dispute);
        break;
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeClosed(supabase, dispute);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    // Mark webhook as processed
    await supabase
      .from('gw_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('event_id', event.id);

    logStep("Webhook processed successfully");

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handlePaymentSucceeded(
  supabase: any, 
  stripe: Stripe, 
  paymentIntent: Stripe.PaymentIntent
) {
  logStep("Processing payment_intent.succeeded", { id: paymentIntent.id });

  // Find order by payment intent ID
  const { data: order, error: orderError } = await supabase
    .from('gw_orders')
    .select('id, order_number, payment_status')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (orderError || !order) {
    logStep("Order not found for payment intent", { paymentIntentId: paymentIntent.id });
    return;
  }

  // Update order status if not already paid
  if (order.payment_status !== 'paid') {
    await supabase
      .from('gw_orders')
      .update({ 
        payment_status: 'paid',
        status: 'paid'
      })
      .eq('id', order.id);

    logStep("Order updated to paid", { orderId: order.id, orderNumber: order.order_number });
  }

  // Update or create payment record
  const charges = paymentIntent.latest_charge 
    ? [await stripe.charges.retrieve(paymentIntent.latest_charge as string)]
    : [];

  const charge = charges[0];

  await supabase
    .from('gw_payments')
    .upsert({
      order_id: order.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: charge?.id || null,
      status: 'succeeded',
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      payment_method: charge?.payment_method_details?.type || null,
      receipt_url: charge?.receipt_url || null,
    }, { 
      onConflict: 'order_id' 
    });

  logStep("Payment record updated", { orderId: order.id });
}

async function handleChargeRefunded(supabase: any, charge: Stripe.Charge) {
  logStep("Processing charge.refunded", { chargeId: charge.id });

  // Find order by payment intent
  const paymentIntentId = charge.payment_intent as string;
  
  const { data: order, error: orderError } = await supabase
    .from('gw_orders')
    .select('id, order_number, total_amount')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (orderError || !order) {
    logStep("Order not found for refunded charge", { paymentIntentId });
    return;
  }

  // Calculate refund totals
  const totalRefunded = (charge.amount_refunded || 0) / 100;
  const isFullRefund = totalRefunded >= order.total_amount;

  // Update order status
  await supabase
    .from('gw_orders')
    .update({
      payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
      status: isFullRefund ? 'refunded' : 'processing'
    })
    .eq('id', order.id);

  logStep("Order refund status updated", { 
    orderId: order.id, 
    totalRefunded, 
    isFullRefund 
  });

  // Record each refund if not already recorded
  if (charge.refunds?.data) {
    for (const refund of charge.refunds.data) {
      const { error } = await supabase
        .from('gw_refunds')
        .upsert({
          order_id: order.id,
          stripe_refund_id: refund.id,
          amount: refund.amount / 100,
          reason: refund.reason || 'requested_by_customer',
          status: refund.status || 'succeeded',
          currency: refund.currency,
        }, {
          onConflict: 'stripe_refund_id'
        });

      if (!error) {
        logStep("Refund record created/updated", { refundId: refund.id });
      }
    }
  }
}

async function handleDisputeCreated(supabase: any, dispute: Stripe.Dispute) {
  logStep("Processing dispute.created", { disputeId: dispute.id });

  const chargeId = dispute.charge as string;
  
  // Find order by looking up the charge's payment intent
  const { data: payment } = await supabase
    .from('gw_payments')
    .select('order_id')
    .eq('stripe_charge_id', chargeId)
    .single();

  await supabase.from('gw_disputes').insert({
    stripe_dispute_id: dispute.id,
    order_id: payment?.order_id || null,
    amount: dispute.amount / 100,
    reason: dispute.reason,
    status: 'needs_response',
    evidence_due_by: dispute.evidence_details?.due_by 
      ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
      : null,
  });

  logStep("Dispute created", { disputeId: dispute.id, orderId: payment?.order_id });
}

async function handleDisputeUpdated(supabase: any, dispute: Stripe.Dispute) {
  logStep("Processing dispute.updated", { disputeId: dispute.id, status: dispute.status });

  await supabase
    .from('gw_disputes')
    .update({
      status: dispute.status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_dispute_id', dispute.id);
}

async function handleDisputeClosed(supabase: any, dispute: Stripe.Dispute) {
  logStep("Processing dispute.closed", { disputeId: dispute.id, status: dispute.status });

  await supabase
    .from('gw_disputes')
    .update({
      status: dispute.status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_dispute_id', dispute.id);

  logStep("Dispute closed", { disputeId: dispute.id, finalStatus: dispute.status });
}
