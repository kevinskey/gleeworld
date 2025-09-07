import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Function started successfully");
    
    // Get request body
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body));

    const { appointmentDetails, paymentType, clientName, clientEmail } = body;

    // Check environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log("Stripe key exists:", !!stripeKey);
    console.log("Stripe key length:", stripeKey?.length || 0);

    if (!stripeKey) {
      return new Response(JSON.stringify({ 
        error: "STRIPE_SECRET_KEY is not configured" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Initialize Stripe
    const stripe = new (await import("https://esm.sh/stripe@14.21.0")).default(stripeKey, {
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