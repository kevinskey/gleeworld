import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateCaller, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Signed-in users only — every token starts a billable ElevenLabs WebRTC
  // conversation, so this must never be an open faucet.
  const caller = await authenticateCaller(req);
  if (!caller || !caller.userId) return unauthorizedResponse(corsHeaders);

  try {
    // Key rotation left the live env var named ELEVENLABS_API_KEY_1 —
    // same fallback chain elevenlabs-tts uses.
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_1") || Deno.env.get("ELEVENLABS_API_KEY");
    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ElevenLabs API key not configured (checked ELEVENLABS_API_KEY_1 and ELEVENLABS_API_KEY)");
    }

    if (!ELEVENLABS_AGENT_ID) {
      throw new Error("ELEVENLABS_AGENT_ID not configured - please create an agent at elevenlabs.io");
    }

    console.log("Requesting conversation token for agent:", ELEVENLABS_AGENT_ID);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      // Pass the REASON through, not just the status.
      //
      // "ElevenLabs API error: 401" told a user nothing and told the next
      // person debugging it even less — the actual cause (a restricted key
      // without convai permissions, an expired key, a deleted agent) was
      // visible only in a container log nobody thinks to read. These are
      // configuration faults that persist for hours, so the message has to
      // survive the trip to the browser.
      let detail = "";
      try {
        const parsed = JSON.parse(errorText);
        detail = parsed?.detail?.message ?? parsed?.detail?.status ?? parsed?.message ?? "";
      } catch {
        detail = errorText.slice(0, 200);
      }
      const hint = /convai/i.test(detail)
        ? " The ElevenLabs API key is missing its Conversational AI permissions — enable convai_read and convai_write on the key."
        : response.status === 401
          ? " The ElevenLabs API key was rejected."
          : "";
      throw new Error(`ElevenLabs ${response.status}: ${detail}${hint}`);
    }

    const data = await response.json();
    console.log("Conversation token generated successfully");

    return new Response(JSON.stringify({ token: data.token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating conversation token:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
