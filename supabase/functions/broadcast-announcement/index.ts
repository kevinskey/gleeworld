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
    const announcementsDir = "announcements";
    const fullPath = `${announcementsDir}/${fileName}`;

    const formData = new FormData();

    // AzuraCast expects multipart/form-data with a real file part named `file`.
    const fileBytes = new Uint8Array(audioBuffer);
    const file = new File([fileBytes], fileName, { type: "audio/mpeg" });

    formData.append("file", file, fileName);
    // AzuraCast expects the destination path INCLUDING filename.
    formData.append("path", fullPath);
    // Some installs also pass currentDirectory; safe to include.
    formData.append("currentDirectory", announcementsDir);

    const uploadUrl = "https://radio.gleeworld.org/api/station/glee_world_radio/files/upload";
    console.log("Uploading to AzuraCast:", uploadUrl, "path=", fullPath);

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

    // Step 3: Search for the uploaded file to get its media ID
    // AzuraCast upload doesn't return the media ID, so we need to find it
    console.log("Searching for uploaded file:", fullPath);
    
    // Wait a moment for AzuraCast to process the file
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const filesListUrl = `https://radio.gleeworld.org/api/station/glee_world_radio/files/list?searchPhrase=${encodeURIComponent(fileName)}`;
    const filesResponse = await fetch(filesListUrl, {
      method: "GET",
      headers: {
        "X-API-Key": AZURACAST_API_KEY,
        "Accept": "application/json",
      },
    });

    let mediaId: string | null = null;
    
    if (filesResponse.ok) {
      const filesList = await filesResponse.json();
      console.log("Files search result:", JSON.stringify(filesList).substring(0, 500));
      
      // Find our uploaded file by path
      const uploadedFile = Array.isArray(filesList)
        ? filesList.find((f: any) =>
            f.path === fullPath ||
            f.path?.endsWith(fileName) ||
            f.media?.path === fullPath ||
            f.media?.path?.endsWith(fileName)
          )
        : null;

      if (uploadedFile) {
        // AzuraCast returns media details nested under `media` for type="media" rows
        mediaId = String(
          uploadedFile.media?.id ??
            uploadedFile.media?.unique_id ??
            uploadedFile.id ??
            uploadedFile.unique_id ??
            ""
        ) || null;

        console.log("Found uploaded file, media ID:", mediaId);
      } else {
        console.warn("Could not find uploaded file in search results");
      }
    } else {
      console.warn("Files list search failed:", filesResponse.status);
    }

    // Step 4: Queue the announcement for immediate playback
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
        const queueResult = await queueResponse.json();
        console.log("Announcement queued successfully:", queueResult);
      } else {
        const queueError = await queueResponse.text();
        console.warn("Queue response:", queueResponse.status, queueError);
      }
    } else {
      console.warn("No media ID found, cannot queue announcement");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: mediaId ? "Announcement uploaded and queued for broadcast" : "Announcement uploaded but could not be queued",
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
