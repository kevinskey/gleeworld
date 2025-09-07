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

    // Create a fake checkout URL for now to test the flow
    const fakeCheckoutUrl = `https://checkout.stripe.com/pay/fake-session#${Date.now()}`;
    
    console.log("Returning fake checkout URL:", fakeCheckoutUrl);

    return new Response(JSON.stringify({ 
      url: fakeCheckoutUrl,
      sessionId: `fake_session_${Date.now()}`,
      message: "Test mode - using fake Stripe session"
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