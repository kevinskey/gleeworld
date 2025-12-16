import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();
    
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const AZURACAST_API_KEY = Deno.env.get("AZURACAST_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!AZURACAST_API_KEY) {
      console.error("AZURACAST_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AZURACAST_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify authentication
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid authentication" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify admin/exec permissions
      const { data: profile } = await supabase
        .from("gw_profiles")
        .select("is_admin, is_super_admin, is_exec_board")
        .eq("user_id", user.id)
        .single();

      if (!profile?.is_admin && !profile?.is_super_admin && !profile?.is_exec_board) {
        return new Response(
          JSON.stringify({ error: "Admin or exec board permissions required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Generating TTS for announcement:", text.substring(0, 50) + "...");

    // Step 1: Generate TTS audio using ElevenLabs
    const selectedVoiceId = voiceId || "cgSgspJ2msm6clMCkdW9"; // Jessica voice

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("ElevenLabs API error:", ttsResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `TTS generation failed: ${ttsResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    console.log("TTS generated, size:", audioBuffer.byteLength);

    // Step 2: Upload to AzuraCast media library
    const fileName = `announcement_${Date.now()}.mp3`;
    const formData = new FormData();

    // AzuraCast's /files endpoint expects a multipart upload where `file` is a real file part.
    // In practice, some AzuraCast installs don't recognize a raw Blob part as an uploaded file.
    const fileBytes = new Uint8Array(audioBuffer);
    const file = new File([fileBytes], fileName, { type: "audio/mpeg" });

    // Ensure filename is explicitly provided in multipart disposition
    formData.append("file", file, fileName);
    // AzuraCast expects the *destination path including filename*, NOT just a directory
    formData.append("path", fileName);

    const uploadUrl = "https://radio.gleeworld.org/api/station/glee_world_radio/files";
    console.log("Uploading to AzuraCast:", uploadUrl, "path=", fileName);

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-API-Key": AZURACAST_API_KEY,
        "Accept": "application/json",
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      console.error("AzuraCast upload error:", uploadResponse.status, uploadError);
      return new Response(
        JSON.stringify({ error: `Upload to radio failed: ${uploadResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadResult = await uploadResponse.json();
    console.log("Upload successful:", uploadResult);

    // Step 3: Queue the announcement for immediate playback
    const mediaId = uploadResult.id || uploadResult.unique_id;
    
    if (mediaId) {
      const queueUrl = `https://radio.gleeworld.org/api/station/glee_world_radio/queue`;
      console.log("Queueing announcement for playback, media ID:", mediaId);

      const queueResponse = await fetch(queueUrl, {
        method: "POST",
        headers: {
          "X-API-Key": AZURACAST_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_id: mediaId,
        }),
      });

      if (queueResponse.ok) {
        console.log("Announcement queued successfully");
      } else {
        const queueError = await queueResponse.text();
        console.warn("Queue response:", queueResponse.status, queueError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Announcement uploaded and queued for broadcast",
        mediaId,
        fileName 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Broadcast announcement error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
