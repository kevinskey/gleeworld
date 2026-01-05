import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EASYPOST_API_URL = "https://api.easypost.com/v2";

interface AddressInput {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

interface ParcelInput {
  length: number;
  width: number;
  height: number;
  weight: number; // in ounces
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EASYPOST] ${step}${detailsStr}`);
};

async function easypostRequest(endpoint: string, method: string, body?: unknown) {
  const apiKey = Deno.env.get("EASYPOST_API_KEY");
  if (!apiKey) throw new Error("EASYPOST_API_KEY not configured");

  const auth = btoa(`${apiKey}:`);
  
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${EASYPOST_API_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    logStep("EasyPost API Error", data);
    throw new Error(data.error?.message || "EasyPost API error");
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    logStep("Request received", { action });

    let result;

    switch (action) {
      case "get_rates": {
        const { fromAddress, toAddress, parcel } = params as {
          fromAddress: AddressInput;
          toAddress: AddressInput;
          parcel: ParcelInput;
        };

        logStep("Getting shipping rates", { to: toAddress.city, parcel });

        // Create shipment to get rates
        const shipment = await easypostRequest("/shipments", "POST", {
          shipment: {
            from_address: fromAddress,
            to_address: toAddress,
            parcel: parcel,
          },
        });

        logStep("Rates retrieved", { rateCount: shipment.rates?.length });

        // Sort rates by price
        const sortedRates = shipment.rates?.sort(
          (a: { rate: string }, b: { rate: string }) => 
            parseFloat(a.rate) - parseFloat(b.rate)
        ) || [];

        result = {
          shipment_id: shipment.id,
          rates: sortedRates.map((rate: {
            id: string;
            carrier: string;
            service: string;
            rate: string;
            currency: string;
            delivery_days: number;
            est_delivery_date: string;
          }) => ({
            id: rate.id,
            carrier: rate.carrier,
            service: rate.service,
            rate: parseFloat(rate.rate),
            currency: rate.currency,
            delivery_days: rate.delivery_days,
            est_delivery_date: rate.est_delivery_date,
          })),
        };
        break;
      }

      case "buy_label": {
        const { shipmentId, rateId } = params as {
          shipmentId: string;
          rateId: string;
        };

        logStep("Buying shipping label", { shipmentId, rateId });

        const shipment = await easypostRequest(`/shipments/${shipmentId}/buy`, "POST", {
          rate: { id: rateId },
        });

        logStep("Label purchased", { trackingCode: shipment.tracking_code });

        result = {
          tracking_code: shipment.tracking_code,
          label_url: shipment.postage_label?.label_url,
          tracking_url: shipment.tracker?.public_url,
          carrier: shipment.selected_rate?.carrier,
          service: shipment.selected_rate?.service,
        };
        break;
      }

      case "track": {
        const { trackingCode, carrier } = params as {
          trackingCode: string;
          carrier: string;
        };

        logStep("Tracking shipment", { trackingCode, carrier });

        const tracker = await easypostRequest("/trackers", "POST", {
          tracker: {
            tracking_code: trackingCode,
            carrier: carrier,
          },
        });

        result = {
          status: tracker.status,
          status_detail: tracker.status_detail,
          est_delivery_date: tracker.est_delivery_date,
          tracking_details: tracker.tracking_details,
        };
        break;
      }

      case "validate_address": {
        const { address } = params as { address: AddressInput };

        logStep("Validating address", { city: address.city });

        const verified = await easypostRequest("/addresses", "POST", {
          address: {
            ...address,
            verify: ["delivery"],
          },
        });

        result = {
          valid: verified.verifications?.delivery?.success || false,
          errors: verified.verifications?.delivery?.errors || [],
          suggested_address: verified.verifications?.delivery?.success ? {
            street1: verified.street1,
            street2: verified.street2,
            city: verified.city,
            state: verified.state,
            zip: verified.zip,
            country: verified.country,
          } : null,
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
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
