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

    console.log(`Verifying dues payment session: ${sessionId}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase client with service role key for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent']
    });

    console.log(`Session status: ${session.payment_status}, metadata:`, session.metadata);

    if (session.payment_status === 'paid') {
      const metadata = session.metadata;
      const paymentType = metadata?.payment_type;
      const duesRecordId = metadata?.dues_record_id;
      const userId = metadata?.user_id;

      if (!paymentType || !duesRecordId || !userId) {
        throw new Error("Missing required metadata");
      }

      if (paymentType === 'full') {
        // Update dues record to paid
        const { error: updateError } = await supabase
          .from('gw_dues_records')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            payment_method: 'stripe',
            updated_at: new Date().toISOString()
          })
          .eq('id', duesRecordId)
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating dues record:', updateError);
          throw new Error('Failed to update dues record');
        }

        console.log(`Successfully updated dues record ${duesRecordId} to paid`);

      } else if (paymentType === 'installment') {
        const installmentId = metadata?.installment_id;
        const paymentPlanId = metadata?.payment_plan_id;

        if (!installmentId || !paymentPlanId) {
          throw new Error("Missing installment metadata");
        }

        // Update installment to paid
        const { error: installmentError } = await supabase
          .from('gw_payment_plan_installments')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            payment_method: 'stripe',
            transaction_id: session.payment_intent?.id || session.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', installmentId);

        if (installmentError) {
          console.error('Error updating installment:', installmentError);
          throw new Error('Failed to update installment');
        }

        console.log(`Successfully updated installment ${installmentId} to paid`);

        // Check if all installments are paid to update the dues record
        const { data: allInstallments, error: checkError } = await supabase
          .from('gw_payment_plan_installments')
          .select('status')
          .eq('payment_plan_id', paymentPlanId);

        if (!checkError && allInstallments) {
          const allPaid = allInstallments.every(inst => inst.status === 'paid');
          
          if (allPaid) {
            // All installments paid, update dues record
            const { error: duesUpdateError } = await supabase
              .from('gw_dues_records')
              .update({
                status: 'paid',
                paid_date: new Date().toISOString(),
                payment_method: 'stripe',
                updated_at: new Date().toISOString()
              })
              .eq('id', duesRecordId)
              .eq('user_id', userId);

            if (!duesUpdateError) {
              console.log(`All installments paid, updated dues record ${duesRecordId} to paid`);
            }
          }
        }
      }

      // Store payment record for tracking
      const { error: paymentError } = await supabase
        .from('gw_user_orders')
        .upsert({
          stripe_session_id: sessionId,
          customer_email: session.customer_details?.email,
          customer_name: session.customer_details?.name,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          status: 'completed',
          metadata: {
            ...session.metadata,
            payment_intent_id: session.payment_intent?.id,
            session_type: 'dues_payment'
          },
        }, { 
          onConflict: 'stripe_session_id',
          ignoreDuplicates: true 
        });

      if (paymentError) {
        console.error('Error saving payment record:', paymentError);
        // Don't throw here as the main payment processing succeeded
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_status: session.payment_status,
          payment_type: paymentType,
          customer_email: session.customer_details?.email,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          dues_record_id: duesRecordId,
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
    console.error("Dues payment verification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});