import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-APPOINTMENT-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method, url: req.url });

    // Get request body
    const { appointmentDetails, paymentType, clientName, clientEmail } = await req.json();
    logStep("Request data received", { appointmentDetails, paymentType, clientName, clientEmail });

    // Validate required environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are not set");
    }

    logStep("Environment variables validated");

    // Dynamically import Stripe to avoid startup issues
    const { default: Stripe } = await import("https://esm.sh/stripe@14.21.0");
    logStep("Stripe imported successfully");

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    logStep("Stripe initialized");

    // Create or get Stripe customer
    const customers = await stripe.customers.list({ 
      email: clientEmail, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: clientEmail,
        name: clientName,
      });
      customerId = customer.id;
      logStep("Created new customer", { customerId });
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${appointmentDetails.service} Appointment`,
              description: `Appointment on ${appointmentDetails.date} at ${appointmentDetails.time}`,
            },
            unit_amount: 5000, // $50.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/booking`,
      metadata: {
        appointment_service: appointmentDetails.service,
        appointment_date: appointmentDetails.date,
        appointment_time: appointmentDetails.time,
        client_name: clientName,
        client_email: clientEmail,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});