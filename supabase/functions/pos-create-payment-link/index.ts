import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cartItems, requiresShipping, shippingMode, shippingAddress, couponCode } = await req.json();

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Validate coupon if provided
    let couponValid = false;
    let discountPercent = 0;
    if (couponCode) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data: couponResult } = await supabaseAdmin.rpc('validate_coupon', { p_code: couponCode });
      if (couponResult?.valid && couponResult.discount_type === 'percent') {
        couponValid = true;
        discountPercent = couponResult.discount_value;
      }
    }

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

    if (couponCode) {
      metadata.coupon_code = couponCode;
    }

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

    // Apply coupon discount via Stripe
    if (couponValid && discountPercent > 0) {
      const stripeCoupon = await stripe.coupons.create({
        percent_off: discountPercent,
        duration: 'once',
        name: `POS Coupon: ${couponCode}`,
      });
      sessionParams.discounts = [{ coupon: stripeCoupon.id }];
    }

    // If shipping needed and customer fills address, enable Stripe's address collection
    if (requiresShipping && shippingMode === "customer_fills") {
      sessionParams.shipping_address_collection = {
        allowed_countries: ["US"],
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Redeem coupon after successful session creation
    if (couponValid && couponCode) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.product.price * item.quantity), 0);
      await supabaseAdmin.rpc('redeem_coupon', { p_code: couponCode, p_order_total: subtotal, p_channel: 'pos' });
    }

    console.log("[POS] Payment session created", {
      sessionId: session.id,
      requiresShipping,
      shippingMode,
      shippingItems: shippingItemTitles.length,
      couponApplied: couponValid,
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
