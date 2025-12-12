import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  sessionId: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-APPOINTMENT-PAYMENT] ${step}${detailsStr}`);
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId }: VerifyRequest = await req.json();
    logStep("Verifying session", { sessionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer']
    });

    logStep("Session retrieved", { 
      paymentStatus: session.payment_status,
      mode: session.mode,
      customerEmail: session.customer_details?.email 
    });

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Extract appointment details from metadata
    const metadata = session.metadata;
    if (!metadata) {
      throw new Error("No appointment metadata found in session");
    }

    // Create the appointment in the database
    const appointmentData = {
      title: metadata.service,
      service: metadata.service,
      provider_id: metadata.provider_id,
      client_name: metadata.client_name,
      client_email: metadata.client_email,
      date: metadata.appointment_date,
      time: metadata.appointment_time,
      duration_minutes: parseInt(metadata.duration_minutes),
      status: 'confirmed',
      payment_status: 'paid',
      stripe_session_id: sessionId,
      payment_amount: session.amount_total,
      is_recurring: session.mode === 'subscription',
      created_at: new Date().toISOString(),
    };

    logStep("Creating appointment", appointmentData);

    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('gw_appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (appointmentError) {
      logStep("Error creating appointment", { error: appointmentError });
      throw new Error(`Failed to create appointment: ${appointmentError.message}`);
    }

    logStep("Appointment created successfully", { appointmentId: appointment.id });

    // If it's a subscription, store the subscription ID for future management
    if (session.mode === 'subscription' && session.subscription) {
      const { error: subError } = await supabaseClient
        .from('gw_appointments')
        .update({ stripe_subscription_id: session.subscription })
        .eq('id', appointment.id);

      if (subError) {
        logStep("Warning: Failed to store subscription ID", { error: subError });
      } else {
        logStep("Subscription ID stored", { subscriptionId: session.subscription });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      appointment: appointment,
      paymentDetails: {
        amount: session.amount_total / 100,
        currency: session.currency,
        isRecurring: session.mode === 'subscription',
        customerEmail: session.customer_details?.email
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});