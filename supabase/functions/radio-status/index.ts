import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATION_ID = "sd0d2e77cf";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const stationId = url.searchParams.get("stationId") || STATION_ID;

    console.log(`Radio Status Proxy: Fetching status for station ${stationId}`);

    const response = await fetch(
      `https://public.radio.co/stations/${stationId}/status`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "GleeWorld/1.0",
        },
      }
    );

    if (!response.ok) {
      console.error(`Radio.co API error: ${response.status}`);
      return new Response(
        JSON.stringify({ 
          error: `Radio.co API error: ${response.status}`,
          status: "offline" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    console.log(`Radio Status Proxy: Station is ${data.status}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Radio Status Proxy error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        status: "offline" 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
