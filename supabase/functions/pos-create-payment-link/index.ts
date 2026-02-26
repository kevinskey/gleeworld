import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cartItems, requiresShipping, shippingMode, shippingAddress } = await req.json();

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Build line items
    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product.title,
          description: item.shipToCustomer
            ? `${item.product.description || "Merch"} — Ships after tour`
            : item.product.description || undefined,
          images: item.product.images?.filter((img: string) => img).slice(0, 1) || [],
        },
        unit_amount: Math.round(item.product.price * 100),
      },
      quantity: item.quantity,
    }));

    // Determine which items ship
    const shippingItemTitles = cartItems
      .filter((item: any) => item.shipToCustomer)
      .map((item: any) => item.product.title);

    // Build metadata
    const metadata: Record<string, string> = {
      sale_type: "pos_in_person",
      fulfillment_type: requiresShipping ? "mixed" : "in_person_pickup",
      shipping_items: shippingItemTitles.join(", ").slice(0, 500),
    };

    // If staff entered address, store in metadata
    if (shippingMode === "staff_entered" && shippingAddress) {
      metadata.ship_to_name = shippingAddress.name || "";
      metadata.ship_to_line1 = shippingAddress.line1 || "";
      metadata.ship_to_line2 = shippingAddress.line2 || "";
      metadata.ship_to_city = shippingAddress.city || "";
      metadata.ship_to_state = shippingAddress.state || "";
      metadata.ship_to_postal_code = shippingAddress.postal_code || "";
    }

    // Checkout session options
    const sessionParams: any = {
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin") || "https://gleeworld.lovable.app"}/pos?paid=true`,
      cancel_url: `${req.headers.get("origin") || "https://gleeworld.lovable.app"}/pos?paid=false`,
      metadata,
    };

    // If shipping needed and customer fills address, enable Stripe's address collection
    if (requiresShipping && shippingMode === "customer_fills") {
      sessionParams.shipping_address_collection = {
        allowed_countries: ["US"],
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("[POS] Payment session created", {
      sessionId: session.id,
      requiresShipping,
      shippingMode,
      shippingItems: shippingItemTitles.length,
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[POS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
