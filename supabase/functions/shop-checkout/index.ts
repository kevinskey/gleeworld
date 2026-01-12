import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  product_id: string;
  product_title: string;
  product_price: number;
  quantity: number;
  product_type: string;
  product_image?: string;
  requires_shipping: boolean;
  weight?: number;
}

interface CheckoutRequest {
  items: CartItem[];
  customer_email?: string;
  customer_name?: string;
  shipping_address?: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  };
  selected_rate_id?: string;
  shipping_cost?: number;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SHOP-CHECKOUT] ${step}${detailsStr}`);
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

    const body: CheckoutRequest = await req.json();
    const { items, customer_email, customer_name, shipping_address, selected_rate_id, shipping_cost } = body;

    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    logStep("Cart items received", { count: items.length });

    // Try to get authenticated user
    let user = null;
    let userEmail = customer_email;
    let userName = customer_name;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      user = userData.user;
      if (user?.email) {
        userEmail = user.email;
        logStep("Authenticated user", { email: userEmail });
      }
    }

    if (!userEmail) {
      throw new Error("Customer email is required");
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
    const requiresShipping = items.some(item => item.requires_shipping);
    const shippingAmount = requiresShipping && shipping_cost ? shipping_cost : 0;
    const totalAmount = subtotal + shippingAmount;

    logStep("Order totals calculated", { subtotal, shippingAmount, totalAmount, requiresShipping });

    // Generate order number
    const { data: orderNumber } = await supabaseClient.rpc('generate_order_number');
    const finalOrderNumber = orderNumber || `GW-${Date.now()}`;

    logStep("Generated order number", { orderNumber: finalOrderNumber });

    // Create order in database
    const { data: order, error: orderError } = await supabaseClient
      .from('gw_orders')
      .insert({
        user_id: user?.id || null,
        customer_email: userEmail,
        customer_name: userName || userEmail.split('@')[0],
        order_number: finalOrderNumber,
        status: 'pending',
        subtotal,
        shipping_cost: shippingAmount,
        total_amount: totalAmount,
        requires_shipping: requiresShipping,
        shipping_address: shipping_address || null,
        payment_status: 'unpaid'
      })
      .select()
      .single();

    if (orderError) {
      logStep("Order creation error", { error: orderError });
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    logStep("Order created", { orderId: order.id });

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_title: item.product_title,
      unit_price: item.product_price,
      quantity: item.quantity,
      total_price: item.product_price * item.quantity,
      product_type: item.product_type,
      product_image: item.product_image,
      requires_shipping: item.requires_shipping,
      weight: item.weight
    }));

    const { error: itemsError } = await supabaseClient
      .from('gw_order_items')
      .insert(orderItems);

    if (itemsError) {
      logStep("Order items creation error", { error: itemsError });
      // Clean up order if items fail
      await supabaseClient.from('gw_orders').delete().eq('id', order.id);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    logStep("Order items created", { count: orderItems.length });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    // Create line items for Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product_title,
          images: item.product_image ? [item.product_image] : undefined,
        },
        unit_amount: Math.round(item.product_price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add shipping as a line item if applicable
    if (shippingAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping',
            images: undefined,
          },
          unit_amount: Math.round(shippingAmount * 100),
        },
        quantity: 1,
      });
    }

    const origin = req.headers.get("origin") || "https://gleeworld.org";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/order-confirmation?order=${finalOrderNumber}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop?cancelled=true`,
      metadata: {
        order_id: order.id,
        order_number: finalOrderNumber,
      },
      shipping_address_collection: requiresShipping && !shipping_address ? {
        allowed_countries: ['US'],
      } : undefined,
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Update order with Stripe session ID
    await supabaseClient
      .from('gw_orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      order_id: order.id,
      order_number: finalOrderNumber
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
