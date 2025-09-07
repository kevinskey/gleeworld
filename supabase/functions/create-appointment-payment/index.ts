import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  appointmentDetails: {
    service: string;
    providerId: string;
    date: string;
    time: string;
    duration: number; // in minutes
  };
  paymentType: 'one-time' | 'recurring';
  clientName: string;
  clientEmail: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-APPOINTMENT-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const requestData: PaymentRequest = await req.json();
    logStep("Request received", { 
      service: requestData.appointmentDetails.service,
      paymentType: requestData.paymentType,
      clientEmail: requestData.clientEmail 
    });

    // Calculate pricing based on service and duration
    let unitAmount = 0;
    if (requestData.appointmentDetails.service.toLowerCase().includes('lesson')) {
      // $50 per 30 minutes, pro-rated
      const halfHours = requestData.appointmentDetails.duration / 30;
      unitAmount = Math.round(50 * halfHours * 100); // Convert to cents
    }

    if (unitAmount === 0) {
      throw new Error("This service type does not require payment");
    }

    logStep("Calculated pricing", { duration: requestData.appointmentDetails.duration, unitAmount });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ 
      email: requestData.clientEmail, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: requestData.clientEmail,
        name: requestData.clientName,
      });
      customerId = customer.id;
      logStep("Created new customer", { customerId });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Create metadata for the appointment
    const metadata = {
      service: requestData.appointmentDetails.service,
      provider_id: requestData.appointmentDetails.providerId,
      appointment_date: requestData.appointmentDetails.date,
      appointment_time: requestData.appointmentDetails.time,
      duration_minutes: requestData.appointmentDetails.duration.toString(),
      client_name: requestData.clientName,
      client_email: requestData.clientEmail,
    };

    let session;

    if (requestData.paymentType === 'recurring') {
      // Create recurring subscription for weekly lessons
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { 
                name: `Weekly ${requestData.appointmentDetails.service}`,
                description: `${requestData.appointmentDetails.duration} minutes with provider`
              },
              unit_amount: unitAmount,
              recurring: { interval: "week" },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${origin}/appointments?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/appointments?payment=cancelled`,
        metadata,
      });
      logStep("Created recurring payment session", { sessionId: session.id });
    } else {
      // Create one-time payment
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { 
                name: requestData.appointmentDetails.service,
                description: `${requestData.appointmentDetails.duration} minutes lesson`
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/appointments?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/appointments?payment=cancelled`,
        metadata,
      });
      logStep("Created one-time payment session", { sessionId: session.id });
    }

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id,
      amount: unitAmount / 100 // Return amount in dollars
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