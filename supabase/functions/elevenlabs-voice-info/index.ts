import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { voiceIds } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    if (!voiceIds || !Array.isArray(voiceIds)) {
      throw new Error("voiceIds array is required");
    }

    const voices = await Promise.all(
      voiceIds.map(async (voiceId: string) => {
        try {
          const response = await fetch(
            `https://api.elevenlabs.io/v1/voices/${voiceId}`,
            {
              headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
              },
            }
          );

          if (!response.ok) {
            console.error(`Failed to fetch voice ${voiceId}: ${response.status}`);
            return { id: voiceId, name: "Unknown", description: "Voice not found" };
          }

          const data = await response.json();
          return {
            id: voiceId,
            name: data.name || "Unknown",
            description: data.labels?.description || data.labels?.accent || data.description || "Voice",
            labels: data.labels,
          };
        } catch (error) {
          console.error(`Error fetching voice ${voiceId}:`, error);
          return { id: voiceId, name: "Unknown", description: "Error" };
        }
      })
    );

    return new Response(JSON.stringify({ voices }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Voice info error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
