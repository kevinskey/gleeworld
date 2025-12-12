import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DuesPaymentRequest {
  duesRecordId: string;
  paymentType: 'full' | 'installment';
  installmentId?: string; // For installment payments
  paymentPlanId?: string; // For installment payments
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");
    const origin = req.headers.get("origin") || "https://gleeworld.org";

    // Create Supabase clients
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    const user = userData.user;
    console.log(`Processing dues payment for user: ${user.id}`);

    // Parse request body
    const { duesRecordId, paymentType, installmentId, paymentPlanId }: DuesPaymentRequest = await req.json();

    if (!duesRecordId) {
      throw new Error("Dues record ID is required");
    }

    // Get dues record
    const { data: duesRecord, error: duesError } = await supabaseService
      .from('gw_dues_records')
      .select('*, gw_profiles(full_name, email)')
      .eq('id', duesRecordId)
      .eq('user_id', user.id)
      .single();

    if (duesError || !duesRecord) {
      throw new Error("Dues record not found or access denied");
    }

    console.log(`Found dues record: ${duesRecord.id}, Amount: ${duesRecord.amount}`);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check for existing Stripe customer
    let customerId: string | undefined;
    if (user.email) {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    let sessionData: any;
    let metadata: any = {
      dues_record_id: duesRecordId,
      user_id: user.id,
      payment_type: paymentType,
      semester: duesRecord.semester,
      academic_year: duesRecord.academic_year,
    };

    if (paymentType === 'full') {
      // Full payment
      sessionData = {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Glee Club Dues - ${duesRecord.semester} ${duesRecord.academic_year}`,
                description: `Full payment for ${duesRecord.gw_profiles?.full_name || user.email}`,
              },
              unit_amount: Math.round(duesRecord.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/dues-management/success?session_id={CHECKOUT_SESSION_ID}&type=full`,
        cancel_url: `${origin}/dues-management`,
        metadata,
      };
    } else if (paymentType === 'installment') {
      // Installment payment
      if (!installmentId || !paymentPlanId) {
        throw new Error("Installment ID and Payment Plan ID are required for installment payments");
      }

      // Get installment details
      const { data: installment, error: installmentError } = await supabaseService
        .from('gw_payment_plan_installments')
        .select('*, gw_dues_payment_plans(*)')
        .eq('id', installmentId)
        .eq('payment_plan_id', paymentPlanId)
        .single();

      if (installmentError || !installment) {
        throw new Error("Installment not found");
      }

      // Verify the payment plan belongs to the user
      if (installment.gw_dues_payment_plans.user_id !== user.id) {
        throw new Error("Payment plan access denied");
      }

      console.log(`Processing installment payment: ${installment.installment_number} of ${installment.gw_dues_payment_plans.installments}`);

      metadata.installment_id = installmentId;
      metadata.payment_plan_id = paymentPlanId;
      metadata.installment_number = installment.installment_number;

      sessionData = {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Glee Club Dues - Installment ${installment.installment_number}`,
                description: `${duesRecord.semester} ${duesRecord.academic_year} - Installment ${installment.installment_number} of ${installment.gw_dues_payment_plans.installments}`,
              },
              unit_amount: Math.round(installment.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/dues-management/success?session_id={CHECKOUT_SESSION_ID}&type=installment`,
        cancel_url: `${origin}/dues-management`,
        metadata,
      };
    } else {
      throw new Error("Invalid payment type");
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionData);

    console.log(`Created Stripe session: ${session.id}`);

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        sessionId: session.id,
        paymentType,
        amount: paymentType === 'full' ? duesRecord.amount : (paymentType === 'installment' ? sessionData.line_items[0].price_data.unit_amount / 100 : 0)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Dues payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});