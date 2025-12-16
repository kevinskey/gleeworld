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

    // Step 3: Search for the uploaded file to get its media + song IDs
    // AzuraCast upload doesn't return IDs, so we need to find it
    console.log("Searching for uploaded file:", fullPath);

    // Wait a moment for AzuraCast to process the file
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const filesListUrl = `https://radio.gleeworld.org/api/station/glee_world_radio/files/list?searchPhrase=${encodeURIComponent(fileName)}`;
    const filesResponse = await fetch(filesListUrl, {
      method: "GET",
      headers: {
        "X-API-Key": AZURACAST_API_KEY,
        Accept: "application/json",
      },
    });

    let mediaId: string | null = null;
    let songId: string | null = null;

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
        mediaId = String(uploadedFile.media?.id ?? uploadedFile.id ?? "") || null;
        songId = String(uploadedFile.media?.song_id ?? "") || null;

        console.log("Found uploaded file, media ID:", mediaId, "song ID:", songId);
      } else {
        console.warn("Could not find uploaded file in search results");
      }
    } else {
      console.warn("Files list search failed:", filesResponse.status);
    }

    // Step 4: Make announcement requestable + request immediate playback
    // Note: POST /queue is disabled on this station (405), so we use the Requests API.
    if (mediaId) {
      // 4a) Pick a requestable playlist (prefer one named "Requests", fallback to "Jingles")
      let targetPlaylistId: number | null = null;

      try {
        const playlistsUrl = `https://radio.gleeworld.org/api/station/glee_world_radio/playlists`;
        const playlistsResp = await fetch(playlistsUrl, {
          method: "GET",
          headers: {
            "X-API-Key": AZURACAST_API_KEY,
            Accept: "application/json",
          },
        });

        if (playlistsResp.ok) {
          const playlists = await playlistsResp.json();

          const findByName = (name: string) =>
            Array.isArray(playlists)
              ? playlists.find((p: any) =>
                  String(p.name || "")
                    .toLowerCase()
                    .includes(name.toLowerCase())
                )
              : null;

          const preferred = findByName("requests") ?? findByName("announcement") ?? findByName("jingles");
          if (preferred?.id) {
            targetPlaylistId = Number(preferred.id);
            console.log("Selected playlist for announcement:", preferred.name, "id=", targetPlaylistId);
          }
        } else {
          console.warn("Failed to fetch playlists:", playlistsResp.status);
        }
      } catch (err) {
        console.warn("Error fetching playlists:", err);
      }

      // Hard fallback (existing known Jingles playlist id)
      if (!targetPlaylistId) {
        targetPlaylistId = 21;
        console.log("Falling back to playlist ID 21 (Jingles)");
      }

      // 4b) Attach the file to the chosen playlist
      const fileId = mediaId;
      const updateFileUrl = `https://radio.gleeworld.org/api/station/glee_world_radio/file/${fileId}`;
      console.log("Adding announcement to playlist, file ID:", fileId, "playlist ID:", targetPlaylistId);

      try {
        const updateResponse = await fetch(updateFileUrl, {
          method: "PUT",
          headers: {
            "X-API-Key": AZURACAST_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playlists: [targetPlaylistId],
          }),
        });

        if (updateResponse.ok) {
          console.log("Added to playlist successfully");
        } else {
          const updateError = await updateResponse.text();
          console.warn("Failed to add to playlist:", updateResponse.status, updateError);
        }
      } catch (err) {
        console.warn("Error adding to playlist:", err);
      }

      // Wait for AzuraCast to process the playlist update
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // 4c) Request immediate playback via Requests API (match by song_id)
      const requestsUrl = `https://radio.gleeworld.org/api/station/glee_world_radio/requests`;
      console.log("Fetching requestable songs to find announcement...");

      try {
        const requestsResponse = await fetch(requestsUrl, {
          method: "GET",
          headers: {
            "X-API-Key": AZURACAST_API_KEY,
            Accept: "application/json",
          },
        });

        if (requestsResponse.ok) {
          const requestableSongs = await requestsResponse.json();
          console.log(
            "Got",
            Array.isArray(requestableSongs) ? requestableSongs.length : 0,
            "requestable songs"
          );

          const announcement = Array.isArray(requestableSongs)
            ? requestableSongs.find((s: any) =>
                (songId && String(s.song?.id) === String(songId)) ||
                s.song?.path?.includes(fileName)
              )
            : null;

          if (announcement?.request_id) {
            console.log("Found announcement in requestable list, request_id:", announcement.request_id);

            const submitRequestUrl = `https://radio.gleeworld.org/api/station/glee_world_radio/request/${announcement.request_id}`;
            const submitResponse = await fetch(submitRequestUrl, {
              method: "POST",
              headers: {
                "X-API-Key": AZURACAST_API_KEY,
                Accept: "application/json",
              },
            });

            if (submitResponse.ok) {
              console.log("Announcement requested for immediate playback!");
            } else {
              const submitError = await submitResponse.text();
              console.warn("Request submission failed:", submitResponse.status, submitError);
            }
          } else {
            console.warn(
              "Announcement not found in requestable songs list. Likely the target playlist is not requestable; it will play in rotation if scheduled."
            );
          }
        } else {
          console.warn("Failed to fetch requestable songs:", requestsResponse.status);
        }
      } catch (err) {
        console.warn("Error with Requests API:", err);
      }
    } else {
      console.warn("No media ID found, cannot add to playlist or request");
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
