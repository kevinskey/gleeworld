import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveElevenLabsKey } from "../_shared/elevenLabsKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();
    // Support both the connector secret and legacy secret
    const ELEVENLABS_API_KEY = resolveElevenLabsKey();

    if (!ELEVENLABS_API_KEY) {
      console.error("ElevenLabs API key not configured (set ELEVENLABS_API_KEY_1)");
      throw new Error("ElevenLabs API key is not configured");
    }

    if (!text) {
      throw new Error("Text is required");
    }

    console.log("Generating TTS for text:", text.substring(0, 100) + "...");
    console.log("Using voice ID:", voiceId);

    // Default to Jessica voice - natural, young female voice matching the Glee Assistant persona
    const selectedVoiceId = voiceId || "cgSgspJ2msm6clMCkdW9";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5", // Low latency, high quality for real-time
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.4, // More expressive, natural variation
            similarity_boost: 0.75,
            style: 0.5, // Moderate style for conversational tone
            // Speaker boost pushes perceived loudness by pinning peaks near
            // 0 dBFS — routinely clips the returned MP3 on percussive
            // syllables. Client-side volume attenuation can't undo a clipped
            // source, so we leave boost off and let the client set gain.
            use_speaker_boost: false,
            speed: 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("Successfully generated audio, size:", audioBuffer.byteLength);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
