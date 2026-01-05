import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShippingRate {
  id: string;
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  delivery_days: number;
}

interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      cartItems, 
      customerEmail, 
      customerName,
      shippingRate,
      shippingAddress,
      shipmentId
    } = await req.json();

    console.log("[CHECKOUT] Request received", { 
      itemCount: cartItems?.length, 
      hasShippingRate: !!shippingRate 
    });

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Calculate subtotal
    const subtotal = cartItems.reduce((sum: number, item: any) => 
      sum + (item.product.price * item.quantity), 0
    );
    
    // Use EasyPost rate if provided, otherwise fallback to flat rate
    const shippingCost = shippingRate?.rate ?? (subtotal >= 150 ? 0 : 10);
    const total = subtotal + shippingCost;

    console.log("[CHECKOUT] Calculated totals", { subtotal, shippingCost, total });

    // Create line items for Stripe
    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product.title,
          description: item.product.description || undefined,
          images: item.product.images?.filter((img: string) => img) || [],
        },
        unit_amount: Math.round(item.product.price * 100),
      },
      quantity: item.quantity,
    }));

    // Add shipping as a line item
    if (shippingCost > 0) {
      const shippingDescription = shippingRate 
        ? `${shippingRate.carrier} ${shippingRate.service}${shippingRate.delivery_days ? ` (${shippingRate.delivery_days} days)` : ''}`
        : "Standard shipping";
        
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Shipping",
            description: shippingDescription,
          },
          unit_amount: Math.round(shippingCost * 100),
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

    // Build session options
    const sessionOptions: any = {
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/shop`,
      metadata: {
        customer_name: customerName || "",
        subtotal: subtotal.toString(),
        shipping_cost: shippingCost.toString(),
        total: total.toString(),
        shipment_id: shipmentId || "",
        shipping_rate_id: shippingRate?.id || "",
        shipping_carrier: shippingRate?.carrier || "",
        shipping_service: shippingRate?.service || "",
      },
    };

    // If we already have a shipping address from EasyPost, skip Stripe's collection
    // Otherwise, collect it via Stripe
    if (!shippingAddress?.street1) {
      sessionOptions.shipping_address_collection = {
        allowed_countries: ["US", "CA"],
      };
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionOptions);

    console.log("[CHECKOUT] Session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CHECKOUT] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
