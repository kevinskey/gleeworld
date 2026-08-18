import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveElevenLabsKey } from "../_shared/elevenLabsKey.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, duration } = await req.json();
    const ELEVENLABS_API_KEY = resolveElevenLabsKey();

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ElevenLabs API key not configured (set ELEVENLABS_API_KEY_1)");
    }

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    console.log(`Generating sound effect: "${prompt}" (duration: ${duration || 'auto'}s)`);

    const response = await fetch(
      "https://api.elevenlabs.io/v1/sound-generation",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: duration || 2,
          prompt_influence: 0.4,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`Sound effect generated successfully: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("Error generating sound effect:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
