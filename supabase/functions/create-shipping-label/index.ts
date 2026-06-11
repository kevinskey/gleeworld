import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShippingLabelRequest {
  order_id: string;
  carrier?: string;
  service?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SHIPPING-LABEL] ${step}${detailsStr}`);
};

// Shipping origin address from environment
function getFromAddress() {
  const name = Deno.env.get("SHIP_FROM_NAME");
  const street1 = Deno.env.get("SHIP_FROM_STREET1");
  const city = Deno.env.get("SHIP_FROM_CITY");
  const state = Deno.env.get("SHIP_FROM_STATE");
  const zip = Deno.env.get("SHIP_FROM_ZIP");
  const phone = Deno.env.get("SHIP_FROM_PHONE");
  if (!name || !street1 || !city || !state || !zip || !phone) {
    return null;
  }
  return {
    name,
    company: "GleeWorld",
    street1,
    street2: Deno.env.get("SHIP_FROM_STREET2") ?? "",
    city,
    state,
    zip,
    country: "US",
    phone,
    email: "shop@gleeworld.org"
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const easypostKey = Deno.env.get("EASYPOST_API_KEY");
    if (!easypostKey) throw new Error("EASYPOST_API_KEY is not set");

    const fromAddress = getFromAddress();
    if (!fromAddress) {
      return new Response(JSON.stringify({ error: "Shipping origin not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Invalid authorization");

    // Check admin role
    const { data: roles } = await supabaseClient
      .from('app_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('is_active', true);

    const isAdmin = roles?.some(r => 
      ['super_admin', 'admin', 'treasurer'].includes(r.role)
    );

    if (!isAdmin) throw new Error("Admin access required");

    const { order_id, carrier, service }: ShippingLabelRequest = await req.json();

    if (!order_id) throw new Error("Order ID is required");

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('gw_orders')
      .select('*, gw_order_items(*)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    logStep("Order fetched", { orderNumber: order.order_number });

    if (!order.shipping_address) {
      throw new Error("Order has no shipping address");
    }

    if (order.easypost_label_url) {
      throw new Error("Shipping label already exists for this order");
    }

    // Calculate total weight (default to 8 oz if not specified)
    const totalWeight = order.gw_order_items.reduce((sum: number, item: any) => {
      return sum + ((item.weight || 0.5) * item.quantity);
    }, 0);

    const weightInOz = Math.max(totalWeight * 16, 4); // Convert lbs to oz, minimum 4 oz

    logStep("Calculated weight", { weightInOz });

    // Create EasyPost shipment
    const shipmentPayload = {
      shipment: {
        from_address: fromAddress,
        to_address: {
          name: order.shipping_address.name,
          street1: order.shipping_address.street1,
          street2: order.shipping_address.street2 || "",
          city: order.shipping_address.city,
          state: order.shipping_address.state,
          zip: order.shipping_address.zip,
          country: order.shipping_address.country || "US",
          phone: order.shipping_address.phone || "",
          email: order.customer_email
        },
        parcel: {
          weight: weightInOz,
          // Default small package dimensions
          length: 10,
          width: 8,
          height: 4
        },
        options: {
          label_format: "PDF"
        }
      }
    };

    logStep("Creating EasyPost shipment", { 
      toCity: order.shipping_address.city,
      toState: order.shipping_address.state 
    });

    // Create shipment
    const shipmentResponse = await fetch("https://api.easypost.com/v2/shipments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(easypostKey + ":")}`
      },
      body: JSON.stringify(shipmentPayload)
    });

    const shipment = await shipmentResponse.json();

    if (!shipmentResponse.ok) {
      logStep("EasyPost shipment error", shipment);
      throw new Error(shipment.error?.message || "Failed to create shipment");
    }

    logStep("Shipment created", { shipmentId: shipment.id });

    // Select rate - use provided carrier/service or cheapest rate
    let selectedRate;
    if (carrier && service) {
      selectedRate = shipment.rates.find((r: any) => 
        r.carrier.toLowerCase() === carrier.toLowerCase() && 
        r.service.toLowerCase() === service.toLowerCase()
      );
    }
    
    if (!selectedRate) {
      // Find cheapest rate
      selectedRate = shipment.rates.reduce((cheapest: any, rate: any) => {
        return (!cheapest || parseFloat(rate.rate) < parseFloat(cheapest.rate)) ? rate : cheapest;
      }, null);
    }

    if (!selectedRate) {
      throw new Error("No shipping rates available");
    }

    logStep("Selected rate", { 
      carrier: selectedRate.carrier, 
      service: selectedRate.service, 
      rate: selectedRate.rate 
    });

    // Buy the label
    const buyResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipment.id}/buy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(easypostKey + ":")}`
      },
      body: JSON.stringify({ rate: { id: selectedRate.id } })
    });

    const purchasedShipment = await buyResponse.json();

    if (!buyResponse.ok) {
      logStep("EasyPost buy error", purchasedShipment);
      throw new Error(purchasedShipment.error?.message || "Failed to purchase label");
    }

    logStep("Label purchased", { 
      trackingCode: purchasedShipment.tracking_code,
      labelUrl: purchasedShipment.postage_label?.label_url 
    });

    // Update order with shipping info
    const { error: updateError } = await supabaseClient
      .from('gw_orders')
      .update({
        status: 'processing',
        easypost_shipment_id: purchasedShipment.id,
        easypost_tracking_code: purchasedShipment.tracking_code,
        easypost_label_url: purchasedShipment.postage_label?.label_url,
        shipping_carrier: selectedRate.carrier,
        shipping_service: selectedRate.service,
        estimated_delivery_date: purchasedShipment.tracker?.est_delivery_date || null
      })
      .eq('id', order_id);

    if (updateError) {
      logStep("Order update error", { error: updateError });
    }

    return new Response(JSON.stringify({
      success: true,
      shipment_id: purchasedShipment.id,
      tracking_code: purchasedShipment.tracking_code,
      label_url: purchasedShipment.postage_label?.label_url,
      carrier: selectedRate.carrier,
      service: selectedRate.service,
      rate: selectedRate.rate,
      estimated_delivery: purchasedShipment.tracker?.est_delivery_date
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
