import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPOINTMENT-CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { customerEmail }: { customerEmail: string } = await req.json();
    
    if (!customerEmail) {
      throw new Error("Customer email is required");
    }

    logStep("Looking up customer", { customerEmail });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find the customer
    const customers = await stripe.customers.list({ 
      email: customerEmail, 
      limit: 1 
    });

    if (customers.data.length === 0) {
      throw new Error("No customer found with this email");
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Create a customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/appointments?portal=return`,
    });

    logStep("Customer portal session created", { sessionUrl: portalSession.url });

    return new Response(JSON.stringify({ 
      url: portalSession.url 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});