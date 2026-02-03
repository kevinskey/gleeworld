import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATION_ID = "sd0d2e77cf";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: { stationId?: string; endpoint?: string } = {};
    
    // Parse body if present
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        // Ignore JSON parse errors
      }
    }

    const url = new URL(req.url);
    const stationId = body.stationId || url.searchParams.get("stationId") || STATION_ID;
    const endpoint = body.endpoint || url.searchParams.get("endpoint") || "status";

    // Validate endpoint to prevent abuse
    const allowedEndpoints = ["status", "history", "next", "embed/schedule"];
    if (!allowedEndpoints.includes(endpoint)) {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Radio Proxy: Fetching ${endpoint} for station ${stationId}`);

    const response = await fetch(
      `https://public.radio.co/stations/${stationId}/${endpoint}`,
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
    console.log(`Radio Proxy: Successfully fetched ${endpoint}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Radio Proxy error:", error);
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
