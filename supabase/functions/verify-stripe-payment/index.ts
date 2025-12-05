import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent']
    });

    if (session.payment_status === 'paid') {
      // Create Supabase client with service role key for database operations
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Store order in database with idempotency
      const orderData = {
        stripe_session_id: sessionId,
        customer_email: session.customer_details?.email,
        customer_name: session.customer_details?.name || session.metadata?.customer_name,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        status: 'completed',
        shipping_address: session.shipping_details?.address ? {
          line1: session.shipping_details.address.line1,
          line2: session.shipping_details.address.line2,
          city: session.shipping_details.address.city,
          state: session.shipping_details.address.state,
          postal_code: session.shipping_details.address.postal_code,
          country: session.shipping_details.address.country,
        } : null,
        metadata: session.metadata,
      };

      // Use upsert to handle duplicate sessions gracefully
      const { error: orderError } = await supabase
        .from('gw_user_orders')
        .upsert(orderData, { 
          onConflict: 'stripe_session_id',
          ignoreDuplicates: true 
        });

      if (orderError) {
        console.error('Error saving order:', orderError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_status: session.payment_status,
          customer_email: session.customer_details?.email,
          amount: session.amount_total ? session.amount_total / 100 : 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          payment_status: session.payment_status,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});