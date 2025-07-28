import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShippingRequest {
  items: Array<{
    weight?: number;
    requiresShipping: boolean;
    quantity: number;
  }>;
  destination: {
    country: string;
    state?: string;
    postalCode?: string;
  };
  subtotal: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, destination, subtotal }: ShippingRequest = await req.json();

    console.log('Calculating shipping:', { destination, itemCount: items.length });

    // Filter items that require shipping
    const shippableItems = items.filter(item => item.requiresShipping);
    
    if (shippableItems.length === 0) {
      return new Response(JSON.stringify({
        shippingOptions: [{
          id: 'digital',
          name: 'Digital Delivery',
          price: 0,
          estimatedDays: 0,
          description: 'Instant digital delivery'
        }]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate total weight
    const totalWeight = shippableItems.reduce((total, item) => {
      return total + ((item.weight || 0.5) * item.quantity); // Default 0.5 lbs per item
    }, 0);

    const shippingOptions = [];

    // Free shipping over $150
    if (subtotal >= 150) {
      shippingOptions.push({
        id: 'free',
        name: 'Free Standard Shipping',
        price: 0,
        estimatedDays: 7,
        description: 'Free shipping on orders over $150'
      });
    }

    // Standard shipping rates based on destination
    let standardRate = 8.99; // Default US rate
    let expeditedRate = 18.99;
    let overnightRate = 35.99;

    if (destination.country !== 'US') {
      // International shipping
      standardRate = 25.99;
      expeditedRate = 45.99;
      // No overnight for international
    } else {
      // US domestic - adjust by weight
      if (totalWeight > 2) {
        standardRate += Math.ceil((totalWeight - 2) / 2) * 3.99;
        expeditedRate += Math.ceil((totalWeight - 2) / 2) * 5.99;
        overnightRate += Math.ceil((totalWeight - 2) / 2) * 8.99;
      }
    }

    // Standard shipping
    shippingOptions.push({
      id: 'standard',
      name: destination.country === 'US' ? 'Standard Shipping' : 'International Standard',
      price: standardRate,
      estimatedDays: destination.country === 'US' ? 7 : 14,
      description: destination.country === 'US' 
        ? '5-7 business days via USPS Ground'
        : '10-14 business days international'
    });

    // Expedited shipping
    shippingOptions.push({
      id: 'expedited',
      name: destination.country === 'US' ? 'Expedited Shipping' : 'International Express',
      price: expeditedRate,
      estimatedDays: destination.country === 'US' ? 3 : 7,
      description: destination.country === 'US'
        ? '2-3 business days via UPS'
        : '5-7 business days international express'
    });

    // Overnight (US only)
    if (destination.country === 'US') {
      shippingOptions.push({
        id: 'overnight',
        name: 'Overnight Shipping',
        price: overnightRate,
        estimatedDays: 1,
        description: 'Next business day delivery via FedEx'
      });
    }

    return new Response(JSON.stringify({
      shippingOptions,
      totalWeight,
      freeShippingEligible: subtotal >= 150
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Shipping calculation error:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      shippingOptions: [{
        id: 'standard',
        name: 'Standard Shipping',
        price: 8.99,
        estimatedDays: 7,
        description: 'Standard shipping rate'
      }]
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});