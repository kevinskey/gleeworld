import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundRequest {
  order_id: string;
  amount?: number; // In cents, if partial refund
  reason?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-REFUND] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Invalid authorization");

    // Check admin role
    const { data: roles } = await supabaseClient
      .from('app_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('is_active', true);

    const isAdmin = roles?.some(r => 
      ['super_admin', 'admin', 'treasurer'].includes(r.role)
    );

    if (!isAdmin) throw new Error("Admin access required");

    logStep("Admin authorized", { userId: userData.user.id });

    const { order_id, amount, reason }: RefundRequest = await req.json();

    if (!order_id) throw new Error("Order ID is required");

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('gw_orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    logStep("Order fetched", { orderNumber: order.order_number, paymentStatus: order.payment_status });

    if (order.payment_status !== 'paid') {
      throw new Error("Order must be paid to issue a refund");
    }

    if (!order.stripe_payment_intent_id) {
      throw new Error("No Stripe payment found for this order");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get the payment intent to find charges
    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
    logStep("Payment intent retrieved", { status: paymentIntent.status });

    if (paymentIntent.status !== 'succeeded') {
      throw new Error("Payment was not successful, cannot refund");
    }

    // Calculate refund amount (convert dollars to cents if provided in cents, otherwise use total)
    const refundAmountCents = amount || Math.round(order.total_amount * 100);
    const maxRefundCents = Math.round(order.total_amount * 100);

    if (refundAmountCents > maxRefundCents) {
      throw new Error(`Refund amount ($${(refundAmountCents / 100).toFixed(2)}) exceeds order total ($${order.total_amount.toFixed(2)})`);
    }

    logStep("Creating refund", { amountCents: refundAmountCents });

    // Create the refund
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: reason === 'duplicate' ? 'duplicate' : 
              reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer',
    });

    logStep("Refund created", { refundId: refund.id, status: refund.status });

    // Determine if full or partial refund
    const isFullRefund = refundAmountCents >= maxRefundCents;

    // Update order status
    const { error: updateError } = await supabaseClient
      .from('gw_orders')
      .update({
        payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
        status: isFullRefund ? 'refunded' : order.status,
      })
      .eq('id', order_id);

    if (updateError) {
      logStep("Order update warning", { error: updateError });
    }

    // Record refund in gw_refunds table
    const { error: refundRecordError } = await supabaseClient
      .from('gw_refunds')
      .insert({
        order_id: order_id,
        stripe_refund_id: refund.id,
        amount: refundAmountCents / 100, // Store in dollars
        currency: order.currency || 'usd',
        reason: reason || 'requested_by_customer',
        status: refund.status,
        processed_by: userData.user.id,
      });

    if (refundRecordError) {
      logStep("Refund record warning", { error: refundRecordError });
    }

    logStep("Refund completed successfully");

    return new Response(JSON.stringify({
      success: true,
      refund_id: refund.id,
      status: refund.status,
      amount: refundAmountCents / 100,
      is_full_refund: isFullRefund,
    }), {
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
