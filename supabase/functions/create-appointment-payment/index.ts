import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Appointment Payment Function Started ===");
    console.log("Request method:", req.method);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    
    // Get request body
    const body = await req.json();
    console.log("Request body received:", JSON.stringify(body, null, 2));

    const { appointmentDetails, paymentType, clientName, clientEmail } = body;

    if (!appointmentDetails || !clientName || !clientEmail) {
      console.error("Missing required fields:", { appointmentDetails: !!appointmentDetails, clientName: !!clientName, clientEmail: !!clientEmail });
      return new Response(JSON.stringify({ 
        error: "Missing required fields: appointmentDetails, clientName, and clientEmail are required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log("Stripe key exists:", !!stripeKey);
    console.log("Stripe key first 8 chars:", stripeKey?.substring(0, 8) || 'NONE');

    if (!stripeKey) {
      return new Response(JSON.stringify({ 
        error: "STRIPE_SECRET_KEY is not configured" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Initialize Stripe
    const stripe = new (await import("https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm")).default(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: 'price_1S4arYDuBK8b4VkcEoTDvHOq', // Your lesson price
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get("origin")}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/booking`,
      metadata: {
        appointment_details: JSON.stringify(appointmentDetails),
        payment_type: paymentType,
        client_name: clientName,
        client_email: clientEmail,
      },
    });

    console.log("Stripe session created:", session.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Function error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});