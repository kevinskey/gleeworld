import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { action, ...params } = await req.json();

    switch (action) {
      // List all registered readers
      case "list_readers": {
        const readers = await stripe.terminal.readers.list({
          limit: 100,
          ...(params.location ? { location: params.location } : {}),
        });

        const readerList = readers.data.map((r) => ({
          id: r.id,
          label: r.label,
          serial_number: r.serial_number,
          device_type: r.device_type,
          status: r.status,
          ip_address: (r as any).ip_address || null,
          location: r.location,
        }));

        console.log(`[Terminal] Listed ${readerList.length} readers`);

        return new Response(JSON.stringify({ readers: readerList }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Hand off a PaymentIntent to a reader for processing
      case "process_payment": {
        const { reader_id, payment_intent_id } = params;
        if (!reader_id || !payment_intent_id) {
          throw new Error("reader_id and payment_intent_id are required");
        }

        console.log(`[Terminal] Processing payment ${payment_intent_id} on reader ${reader_id}`);

        const reader = await stripe.terminal.readers.processPaymentIntent(
          reader_id,
          { payment_intent: payment_intent_id }
        );

        return new Response(
          JSON.stringify({
            reader_id: reader.id,
            action: reader.action,
            status: reader.action?.status,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Cancel the current action on a reader
      case "cancel_action": {
        const { reader_id: cancelReaderId } = params;
        if (!cancelReaderId) {
          throw new Error("reader_id is required");
        }

        console.log(`[Terminal] Cancelling action on reader ${cancelReaderId}`);

        const reader = await stripe.terminal.readers.cancelAction(cancelReaderId);

        return new Response(
          JSON.stringify({ reader_id: reader.id, status: "cancelled" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check the status/action of a reader
      case "reader_status": {
        const { reader_id: statusReaderId } = params;
        if (!statusReaderId) {
          throw new Error("reader_id is required");
        }

        const reader = await stripe.terminal.readers.retrieve(statusReaderId);

        return new Response(
          JSON.stringify({
            reader_id: reader.id,
            label: reader.label,
            status: reader.status,
            action: reader.action,
            device_type: reader.device_type,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error("[Terminal Server-Driven] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
