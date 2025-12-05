import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const squareAppId = Deno.env.get('SQUARE_APPLICATION_ID');
const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';

interface PaymentRequest {
  sourceId: string;
  amount: number;
  currency: string;
  orderId: string;
  userId?: string;
  guestEmail?: string;
  billingAddress?: any;
  shippingAddress?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      sourceId,
      amount,
      currency = 'USD',
      orderId,
      userId,
      guestEmail,
      billingAddress,
      shippingAddress
    }: PaymentRequest = await req.json();

    console.log('Processing Square payment:', { orderId, amount, currency });

    // Get order details from database
    const { data: order, error: orderError } = await supabase
      .from('gw_user_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Prepare Square payment request
    const squareApiUrl = squareEnvironment === 'production' 
      ? 'https://connect.squareup.com/v2/payments'
      : 'https://connect.squareupsandbox.com/v2/payments';

    const paymentData = {
      source_id: sourceId,
      amount_money: {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toUpperCase()
      },
      idempotency_key: `${orderId}-${Date.now()}`,
      autocomplete: true,
      location_id: squareAppId, // Using app ID as location ID for simplicity
      reference_id: orderId,
      note: `GleeWorld Shop Order #${order.order_number}`,
      buyer_email_address: userId ? undefined : guestEmail,
      billing_address: billingAddress ? {
        address_line_1: billingAddress.address_line_1,
        address_line_2: billingAddress.address_line_2,
        locality: billingAddress.city,
        administrative_district_level_1: billingAddress.state,
        postal_code: billingAddress.postal_code,
        country: billingAddress.country || 'US'
      } : undefined,
      shipping_address: shippingAddress ? {
        address_line_1: shippingAddress.address_line_1,
        address_line_2: shippingAddress.address_line_2,
        locality: shippingAddress.city,
        administrative_district_level_1: shippingAddress.state,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country || 'US'
      } : undefined
    };

    console.log('Sending payment to Square:', { 
      amount: paymentData.amount_money.amount,
      currency: paymentData.amount_money.currency,
      orderId: paymentData.reference_id
    });

    // Process payment with Square
    const squareResponse = await fetch(squareApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18'
      },
      body: JSON.stringify(paymentData)
    });

    const squareResult = await squareResponse.json();

    if (!squareResponse.ok || squareResult.errors) {
      console.error('Square payment failed:', squareResult);
      throw new Error(squareResult.errors?.[0]?.detail || 'Payment processing failed');
    }

    console.log('Square payment successful:', squareResult.payment.id);

    // Update order status in database
    const { error: updateOrderError } = await supabase
      .from('gw_user_orders')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: 'square',
        payment_id: squareResult.payment.id,
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateOrderError) {
      console.error('Failed to update order:', updateOrderError);
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from('gw_payment_records')
      .insert({
        order_id: orderId,
        amount: amount,
        currency: currency.toUpperCase(),
        payment_method: 'square',
        payment_id: squareResult.payment.id,
        status: 'completed',
        transaction_data: squareResult.payment
      });

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
    }

    // Reduce inventory for order items
    const { data: orderItems } = await supabase
      .from('gw_order_items')
      .select('product_id, variant_id, quantity')
      .eq('order_id', orderId);

    if (orderItems) {
      for (const item of orderItems) {
        if (item.variant_id) {
          await supabase
            .from('gw_product_variants')
            .update({
              inventory_quantity: supabase.raw('inventory_quantity - ?', [item.quantity])
            })
            .eq('id', item.variant_id);
        } else {
          await supabase
            .from('gw_products')
            .update({
              inventory_quantity: supabase.raw('inventory_quantity - ?', [item.quantity])
            })
            .eq('id', item.product_id);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      paymentId: squareResult.payment.id,
      orderId: orderId,
      amount: amount,
      currency: currency.toUpperCase(),
      status: 'completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});