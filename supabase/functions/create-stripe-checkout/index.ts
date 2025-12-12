import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cartItems, customerEmail, customerName } = await req.json();

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Calculate totals
    const subtotal = cartItems.reduce((sum: number, item: any) => 
      sum + (item.product.price * item.quantity), 0
    );
    
    // Free shipping over $150
    const shippingCost = subtotal >= 150 ? 0 : 10;
    const total = subtotal + shippingCost;

    // Create line items for Stripe
    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product.title,
          description: item.product.description,
          images: item.product.images || [],
        },
        unit_amount: Math.round(item.product.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add shipping if applicable
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Shipping",
            description: "Standard shipping (Free over $150)",
          },
          unit_amount: shippingCost * 100,
        },
        quantity: 1,
      });
    }

    // Check for existing customer
    let customerId;
    if (customerEmail) {
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/shop`,
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      metadata: {
        customer_name: customerName || "",
        subtotal: subtotal.toString(),
        shipping_cost: shippingCost.toString(),
        total: total.toString(),
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});