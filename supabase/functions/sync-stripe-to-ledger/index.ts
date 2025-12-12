import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  session_id?: string;
  payment_intent_id?: string;
  sync_all?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    const { session_id, payment_intent_id, sync_all }: SyncRequest = await req.json();

    if (sync_all) {
      // Sync recent successful payments (last 30 days)
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
      
      const sessions = await stripe.checkout.sessions.list({
        created: { gte: thirtyDaysAgo },
        status: 'complete',
        limit: 100,
      });

      let syncedCount = 0;

      for (const session of sessions.data) {
        if (session.payment_status === 'paid') {
          const synced = await syncPaymentToLedger(supabase, stripe, session);
          if (synced) syncedCount++;
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Synced ${syncedCount} payments to ledger`,
          synced_count: syncedCount 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (session_id) {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      
      if (session.payment_status === 'paid') {
        const synced = await syncPaymentToLedger(supabase, stripe, session);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            synced,
            message: synced ? 'Payment synced to ledger' : 'Payment already exists in ledger'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    if (payment_intent_id) {
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      
      if (paymentIntent.status === 'succeeded') {
        const synced = await syncPaymentIntentToLedger(supabase, paymentIntent);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            synced,
            message: synced ? 'Payment synced to ledger' : 'Payment already exists in ledger'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'No valid payment found or payment not completed' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in sync-stripe-to-ledger function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function syncPaymentToLedger(supabase: any, stripe: Stripe, session: any) {
  try {
    // Check if this payment already exists in the ledger
    const { data: existing } = await supabase
      .from('gw_running_ledger')
      .select('id')
      .eq('reference_number', `stripe_${session.id}`)
      .single();

    if (existing) {
      console.log(`Payment ${session.id} already exists in ledger`);
      return false;
    }

    // Get line items to build description
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const productNames = lineItems.data.map(item => item.description || 'Product').join(', ');
    
    // Get customer details if available
    let customerInfo = '';
    if (session.customer) {
      const customer = await stripe.customers.retrieve(session.customer as string);
      if (typeof customer !== 'string' && customer.email) {
        customerInfo = ` - ${customer.email}`;
      }
    }

    const description = `Sale: ${productNames}${customerInfo}`;
    const amount = session.amount_total / 100; // Convert from cents
    const paymentDate = new Date(session.created * 1000);

    // Find a treasurer or admin to attribute the entry to
    const { data: treasurer } = await supabase
      .from('gw_executive_board_members')
      .select('user_id')
      .eq('position', 'treasurer')
      .eq('is_active', true)
      .single();

    let createdBy = treasurer?.user_id;
    
    // If no treasurer, find an admin
    if (!createdBy) {
      const { data: admin } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('is_admin', true)
        .limit(1)
        .single();
      
      createdBy = admin?.user_id;
    }

    if (!createdBy) {
      console.error('No treasurer or admin found to attribute sale to');
      return false;
    }

    // Add to running ledger
    const { error } = await supabase
      .from('gw_running_ledger')
      .insert({
        entry_date: paymentDate.toISOString().split('T')[0],
        description,
        transaction_type: 'credit',
        amount,
        reference_number: `stripe_${session.id}`,
        category: 'sales',
        notes: `Stripe payment ID: ${session.payment_intent}`,
        created_by: createdBy,
        running_balance: 0 // Will be calculated by trigger
      });

    if (error) {
      console.error('Error adding payment to ledger:', error);
      return false;
    }

    console.log(`Successfully synced payment ${session.id} to ledger`);
    return true;

  } catch (error) {
    console.error('Error syncing payment to ledger:', error);
    return false;
  }
}

async function syncPaymentIntentToLedger(supabase: any, paymentIntent: any) {
  try {
    // Check if this payment already exists in the ledger
    const { data: existing } = await supabase
      .from('gw_running_ledger')
      .select('id')
      .eq('reference_number', `stripe_pi_${paymentIntent.id}`)
      .single();

    if (existing) {
      console.log(`Payment Intent ${paymentIntent.id} already exists in ledger`);
      return false;
    }

    const description = `Direct Payment: ${paymentIntent.description || 'Stripe Payment'}`;
    const amount = paymentIntent.amount / 100; // Convert from cents
    const paymentDate = new Date(paymentIntent.created * 1000);

    // Find a treasurer or admin to attribute the entry to
    const { data: treasurer } = await supabase
      .from('gw_executive_board_members')
      .select('user_id')
      .eq('position', 'treasurer')
      .eq('is_active', true)
      .single();

    let createdBy = treasurer?.user_id;
    
    if (!createdBy) {
      const { data: admin } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('is_admin', true)
        .limit(1)
        .single();
      
      createdBy = admin?.user_id;
    }

    if (!createdBy) {
      console.error('No treasurer or admin found to attribute payment to');
      return false;
    }

    // Add to running ledger
    const { error } = await supabase
      .from('gw_running_ledger')
      .insert({
        entry_date: paymentDate.toISOString().split('T')[0],
        description,
        transaction_type: 'credit',
        amount,
        reference_number: `stripe_pi_${paymentIntent.id}`,
        category: 'sales',
        notes: `Direct Stripe payment`,
        created_by: createdBy,
        running_balance: 0 // Will be calculated by trigger
      });

    if (error) {
      console.error('Error adding payment intent to ledger:', error);
      return false;
    }

    console.log(`Successfully synced payment intent ${paymentIntent.id} to ledger`);
    return true;

  } catch (error) {
    console.error('Error syncing payment intent to ledger:', error);
    return false;
  }
}