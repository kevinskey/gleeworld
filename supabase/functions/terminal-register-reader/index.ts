// Terminal reader registration endpoint
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCATION_LABEL = "GleeWorld POS";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registration_code, label } = await req.json();

    if (!registration_code) {
      throw new Error("Registration code is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get or create a location for the readers
    let locationId: string;
    const locations = await stripe.terminal.locations.list({ limit: 1 });

    if (locations.data.length > 0) {
      locationId = locations.data[0].id;
    } else {
      // One-time bootstrap: only runs if this Stripe account has zero
      // Terminal locations yet (the shared sk_live_ key serves multiple
      // businesses — see reference_stripe_account memory doc). This address
      // was a leftover single-tenant default; if a real reader registration
      // ever needs to create a fresh location, replace this placeholder
      // with the actual business address for that registration.
      const location = await stripe.terminal.locations.create({
        display_name: LOCATION_LABEL,
        address: {
          line1: "TODO: set real business address before first use",
          city: "Atlanta",
          state: "GA",
          postal_code: "30314",
          country: "US",
        },
      });
      locationId = location.id;
    }

    // Register the reader
    const reader = await stripe.terminal.readers.create({
      registration_code,
      label: label || "GleeWorld Reader",
      location: locationId,
    });

    console.log("[Terminal] Reader registered:", reader.id);

    return new Response(
      JSON.stringify({
        id: reader.id,
        label: reader.label,
        serial_number: reader.serial_number,
        device_type: reader.device_type,
        status: reader.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[Terminal] Registration error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
