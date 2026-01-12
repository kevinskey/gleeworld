import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SHOP-PAYMENT] ${step}${detailsStr}`);
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

    const { session_id, order_number } = await req.json();

    if (!session_id && !order_number) {
      throw new Error("Either session_id or order_number is required");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let order;

    if (session_id) {
      // Verify via Stripe session
      logStep("Verifying by session ID", { session_id });
      
      const session = await stripe.checkout.sessions.retrieve(session_id);
      logStep("Stripe session retrieved", { 
        status: session.status, 
        paymentStatus: session.payment_status 
      });

      // Get order by session ID
      const { data: orderData, error: orderError } = await supabaseClient
        .from('gw_orders')
        .select('*, gw_order_items(*)')
        .eq('stripe_session_id', session_id)
        .single();

      if (orderError) {
        logStep("Order not found by session", { error: orderError });
        throw new Error("Order not found");
      }

      order = orderData;

      // Update order if payment is complete
      if (session.payment_status === 'paid' && order.payment_status !== 'paid') {
        logStep("Updating order to paid status");
        
        const { error: updateError } = await supabaseClient
          .from('gw_orders')
          .update({
            payment_status: 'paid',
            status: 'paid',
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq('id', order.id);

        if (updateError) {
          logStep("Error updating order", { error: updateError });
        } else {
          order.payment_status = 'paid';
          order.status = 'paid';
          logStep("Order updated successfully");
          
          // Decrease inventory for purchased items
          for (const item of order.gw_order_items) {
            const { error: inventoryError } = await supabaseClient.rpc('decrement_inventory', {
              p_product_id: item.product_id,
              p_quantity: item.quantity
            });
            
            if (inventoryError) {
              logStep("Inventory update warning", { 
                productId: item.product_id, 
                error: inventoryError 
              });
            }
          }
          
          // Send confirmation email to customer
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
            await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                orderId: order.id, 
                emailType: 'confirmation' 
              })
            });
            logStep("Confirmation email triggered");
            
            // Send admin notification
            await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                orderId: order.id, 
                emailType: 'admin_notification' 
              })
            });
            logStep("Admin notification email triggered");
          } catch (emailError) {
            logStep("Email trigger warning", { error: String(emailError) });
          }
        }
      }
    } else {
      // Get order by order number
      logStep("Fetching by order number", { order_number });
      
      const { data: orderData, error: orderError } = await supabaseClient
        .from('gw_orders')
        .select('*, gw_order_items(*)')
        .eq('order_number', order_number)
        .single();

      if (orderError) {
        throw new Error("Order not found");
      }

      order = orderData;
    }

    logStep("Returning order", { 
      orderNumber: order.order_number, 
      status: order.status,
      paymentStatus: order.payment_status 
    });

    return new Response(JSON.stringify({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        subtotal: order.subtotal,
        shipping_cost: order.shipping_cost,
        total_amount: order.total_amount,
        shipping_address: order.shipping_address,
        easypost_tracking_code: order.easypost_tracking_code,
        items: order.gw_order_items,
        created_at: order.created_at
      }
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
