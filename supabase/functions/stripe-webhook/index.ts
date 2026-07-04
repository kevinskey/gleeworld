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

    // ALWAYS require a verified signature. This endpoint is publicly reachable
    // and its events drive privileged writes (subscription/plan activation,
    // order paid/refunded), so an unverified fallback would let anyone forge
    // events by simply omitting the stripe-signature header.
    if (!webhookSecret) {
      logStep("STRIPE_WEBHOOK_SECRET not configured — refusing to process");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } catch (err: any) {
      logStep("Webhook signature verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Processing event", { type: event.type, id: event.id });

    // Store webhook event for audit — AND use it as the idempotency guard.
    // gw_webhook_events.event_id is UNIQUE (column-level UNIQUE NOT NULL in
    // 20260112094123_8c3c027c…, reaffirmed idempotently in
    // 20260704160000_stripe_hardening_rls_constraints.sql), so a re-delivery
    // of an event we've already recorded hits a 23505 unique_violation here.
    // Stripe retries aggressively (slow 2xx, network blips, etc.), so this
    // MUST run — and be checked — before any of the switch/case side effects
    // below (plan activation, order fulfillment, refunds, disputes...).
    const { error: dedupeErr } = await supabase.from('gw_webhook_events').insert({
      provider: 'stripe',
      event_id: event.id,
      event_type: event.type,
      payload: event,
      status: 'processing'
    });
    if (dedupeErr) {
      const isDuplicate = dedupeErr.code === '23505'
        || /duplicate key value/i.test(dedupeErr.message || '');
      if (isDuplicate) {
        logStep("Duplicate event — already processed, skipping side effects", { id: event.id });
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      // Non-duplicate insert failure (e.g. audit table transiently
      // unreachable) — log but don't block fulfillment; the prior code
      // didn't check this error either, so we preserve that best-effort
      // behavior for anything that isn't the dedupe conflict.
      logStep("Webhook audit insert failed (non-duplicate) — continuing", { error: dedupeErr.message });
    }

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

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, stripe, session);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChanged(supabase, subscription);
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

// Fetch the Stripe Subscription's current_period_end for a checkout
// session that just completed. Checkout Sessions carry only the
// subscription ID (a string), not the Subscription object itself, so
// period end always needs this follow-up GET /v1/subscriptions/:id
// (via the Stripe SDK already instantiated in the caller) — there is no
// "session already has it" fast path for an un-expanded session.
async function fetchSubscriptionPeriodEnd(stripe: Stripe, session: Stripe.Checkout.Session): Promise<string | null> {
  const subscriptionId = session.subscription as string | null;
  if (!subscriptionId) return null;
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;
  } catch (e: any) {
    logStep("Failed to fetch subscription for period end", { subscriptionId, error: e?.message });
    return null;
  }
}

// Module add-on checkout (create-module-checkout) — activates the tenant's
// subscription row. Course add-on checkout (create-course-checkout) — writes
// entitlement rows. Shop/order checkouts have neither metadata key and are skipped.
async function handleCheckoutCompleted(supabase: any, stripe: Stripe, session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenant_id || session.client_reference_id;
  const userId   = session.metadata?.user_id;
  const moduleId = session.metadata?.module_id;
  const planId   = session.metadata?.plan_id;
  const kind     = session.metadata?.kind;        // 'plan' | 'personal' | 'addon' | undefined
  const courseSku = session.metadata?.course_sku;
  logStep("Processing checkout.session.completed", { id: session.id, tenantId, userId, moduleId, planId, kind, courseSku });

  if (tenantId && courseSku && session.mode === 'payment') {
    await handleCoursePurchase(supabase, session, tenantId, courseSku);
    return;
  }

  // ── Base plan subscription (create-plan-checkout) ─────────────────
  if (tenantId && planId && session.mode === 'subscription' && kind === 'plan') {
    const cycle = session.metadata?.billing_cycle === 'annual' ? 'annual' : 'monthly';
    const currentPeriodEnd = await fetchSubscriptionPeriodEnd(stripe, session);
    const { error: planErr } = await supabase
      .from('gw_tenant_plans')
      .upsert({
        tenant_id: tenantId,
        plan_id: planId,
        billing_cycle: cycle,
        status: 'active',
        stripe_subscription_id: (session.subscription as string) || null,
        stripe_customer_id: (session.customer as string) || null,
        current_period_end: currentPeriodEnd,
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' });
    if (planErr) {
      logStep("Plan activation failed", { error: planErr.message });
      throw new Error(`Plan activation failed: ${planErr.message}`);
    }
    logStep("Plan activated", { tenantId, planId, cycle });
    if (session.customer) {
      await supabase
        .from('gw_tenants')
        .update({ stripe_customer_id: session.customer as string })
        .eq('id', tenantId)
        .is('stripe_customer_id', null);
    }
    return;
  }

  // ── Personal (user-scope) plan subscription (create-personal-checkout) ──
  if (userId && planId && session.mode === 'subscription' && kind === 'personal') {
    const currentPeriodEnd = await fetchSubscriptionPeriodEnd(stripe, session);
    const { error: userPlanErr } = await supabase
      .from('gw_user_plans')
      .upsert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        stripe_subscription_id: (session.subscription as string) || null,
        stripe_customer_id: (session.customer as string) || null,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (userPlanErr) {
      logStep("Personal plan activation failed", { error: userPlanErr.message });
      throw new Error(`Personal plan activation failed: ${userPlanErr.message}`);
    }
    logStep("Personal plan activated", { userId, planId });
    return;
  }

  if (!tenantId || !moduleId || session.mode !== 'subscription') {
    logStep("Not a module subscription checkout — skipping");
    return;
  }

  const { error } = await supabase
    .from('gw_tenant_subscriptions')
    .upsert({
      tenant_id: tenantId,
      module_id: moduleId,
      status: 'active',
      enabled_at: new Date().toISOString(),
      stripe_subscription_id: (session.subscription as string) || null,
      cancelled_at: null,
    }, { onConflict: 'tenant_id,module_id' });

  if (error) {
    logStep("Module activation failed", { error: error.message });
    throw new Error(`Module activation failed: ${error.message}`);
  }
  logStep("Module activated", { tenantId, moduleId });

  // First checkout may have used customer_email — persist the customer id for next time.
  if (session.customer) {
    await supabase
      .from('gw_tenants')
      .update({ stripe_customer_id: session.customer as string })
      .eq('id', tenantId)
      .is('stripe_customer_id', null);
  }
}

// Course add-on purchase: write entitlement rows (4 rows for a bundle).
// Idempotent: unique(tenant_id, product_id) + upsert ignoreDuplicates.
async function handleCoursePurchase(
  supabase: any,
  session: Stripe.Checkout.Session,
  tenantId: string,
  courseSku: string
) {
  const paymentIntent = (session.payment_intent as string) || null;

  const { data: product, error: prodErr } = await supabase
    .from('gw_course_product')
    .select('id, sku, bundle_key, template_course_id')
    .eq('sku', courseSku)
    .maybeSingle();
  if (prodErr || !product) {
    logStep("Course product not found for sku", { courseSku });
    throw new Error(`Course product not found: ${courseSku}`);
  }

  let rows: { tenant_id: string; product_id: string; source: string; stripe_payment_intent: string | null }[];
  if (!product.template_course_id && product.bundle_key) {
    const { data: members } = await supabase
      .from('gw_course_product')
      .select('id')
      .eq('bundle_key', product.bundle_key)
      .eq('active', true)
      .not('template_course_id', 'is', null);
    rows = (members ?? []).map((m: { id: string }) => ({
      tenant_id: tenantId, product_id: m.id, source: 'bundle', stripe_payment_intent: paymentIntent,
    }));
  } else {
    rows = [{ tenant_id: tenantId, product_id: product.id, source: 'purchase', stripe_payment_intent: paymentIntent }];
  }

  const { error } = await supabase
    .from('gw_tenant_entitlement')
    .upsert(rows, { onConflict: 'tenant_id,product_id', ignoreDuplicates: true });
  if (error) {
    logStep("Entitlement insert failed", { error: error.message });
    throw new Error(`Entitlement insert failed: ${error.message}`);
  }
  logStep("Course entitlements written", { tenantId, courseSku, count: rows.length });

  if (session.customer) {
    await supabase
      .from('gw_tenants')
      .update({ stripe_customer_id: session.customer as string })
      .eq('id', tenantId)
      .is('stripe_customer_id', null);
  }
}

async function handleSubscriptionChanged(supabase: any, subscription: Stripe.Subscription) {
  logStep("Processing subscription change", { id: subscription.id, status: subscription.status });

  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trial',
    past_due: 'past_due',
    unpaid: 'past_due',
    canceled: 'cancelled',
    incomplete_expired: 'cancelled',
  };
  const status = statusMap[subscription.status];
  if (!status) {
    logStep("Ignoring transient subscription status", { status: subscription.status });
    return;
  }

  const update: Record<string, unknown> = {
    status,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
  };

  const tenantId = subscription.metadata?.tenant_id;
  const moduleId = subscription.metadata?.module_id;
  const planId   = subscription.metadata?.plan_id;
  const kind     = subscription.metadata?.kind;

  // Route to the right table based on the SKU kind. plans live in
  // gw_tenant_plans; everything else stays in gw_tenant_subscriptions.
  if (kind === 'plan' && tenantId && planId) {
    const { error } = await supabase
      .from('gw_tenant_plans')
      .update(update)
      .eq('tenant_id', tenantId);
    if (error) {
      logStep("Plan subscription update failed", { error: error.message });
      throw new Error(`Plan subscription update failed: ${error.message}`);
    }
    logStep("Plan row updated", { tenantId, planId, status });
    return;
  }

  // Personal (user-scope) plan — gw_user_plans has a narrower status set
  // (active/past_due/canceled, no 'trial') than gw_tenant_plans, so map
  // separately rather than reuse `status`/`update` above.
  const userId = subscription.metadata?.user_id;
  if (kind === 'personal' && userId && planId) {
    const userStatusMap: Record<string, string> = {
      active: 'active',
      trialing: 'active', // gw_user_plans has no trial state; treat as active until it resolves
      past_due: 'past_due',
      unpaid: 'past_due',
      canceled: 'canceled',
      incomplete_expired: 'canceled',
    };
    const userStatus = userStatusMap[subscription.status];
    if (!userStatus) {
      logStep("Ignoring transient personal-plan subscription status", { status: subscription.status });
      return;
    }
    const { error } = await supabase
      .from('gw_user_plans')
      .update({
        status: userStatus,
        current_period_end: update.current_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (error) {
      logStep("Personal plan subscription update failed", { error: error.message });
      throw new Error(`Personal plan subscription update failed: ${error.message}`);
    }
    logStep("Personal plan row updated", { userId, planId, status: userStatus });
    return;
  }

  // Fallback for events with no (or an unrecognized) kind metadata: resolve
  // by stripe_subscription_id, trying gw_tenant_plans first, then
  // gw_user_plans — covers plan/personal subscriptions whose metadata
  // didn't round-trip for any reason, without disturbing the metadata-based
  // fast paths above.
  if (kind !== 'plan' && kind !== 'personal') {
    const { data: tenantPlanMatch, error: tenantPlanErr } = await supabase
      .from('gw_tenant_plans')
      .update(update)
      .eq('stripe_subscription_id', subscription.id)
      .select('tenant_id');
    if (tenantPlanErr) {
      logStep("Tenant plan update failed (subscription id fallback)", { error: tenantPlanErr.message });
      throw new Error(`Tenant plan update failed: ${tenantPlanErr.message}`);
    }
    if (tenantPlanMatch && tenantPlanMatch.length > 0) {
      logStep("Tenant plan row updated via subscription id fallback", { subscriptionId: subscription.id, status });
      return;
    }

    const userStatusMap: Record<string, string> = {
      active: 'active',
      trialing: 'active',
      past_due: 'past_due',
      unpaid: 'past_due',
      canceled: 'canceled',
      incomplete_expired: 'canceled',
    };
    const userStatus = userStatusMap[subscription.status];
    if (userStatus) {
      const { data: userPlanMatch, error: userPlanErr } = await supabase
        .from('gw_user_plans')
        .update({
          status: userStatus,
          current_period_end: update.current_period_end,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)
        .select('user_id');
      if (userPlanErr) {
        logStep("Personal plan update failed (subscription id fallback)", { error: userPlanErr.message });
        throw new Error(`Personal plan update failed: ${userPlanErr.message}`);
      }
      if (userPlanMatch && userPlanMatch.length > 0) {
        logStep("Personal plan row updated via subscription id fallback", { subscriptionId: subscription.id, status: userStatus });
        return;
      }
    }
  }

  const query = supabase.from('gw_tenant_subscriptions').update(update);
  const { error } = tenantId && moduleId
    ? await query.eq('tenant_id', tenantId).eq('module_id', moduleId)
    : await query.eq('stripe_subscription_id', subscription.id);

  if (error) {
    logStep("Subscription update failed", { error: error.message });
    throw new Error(`Subscription update failed: ${error.message}`);
  }
  logStep("Subscription row updated", { id: subscription.id, status });
}

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
