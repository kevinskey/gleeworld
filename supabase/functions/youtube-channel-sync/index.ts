// Sync a YouTube channel's uploads into public.youtube_videos so the
// tenant's Video Library page can render + tag + share + playlist them
// alongside anything the admin manually pastes.
//
// Input: { handle?: string, channel_id?: string, max?: number }
//   handle     - either "@GleeWorldOfficial" or "GleeWorldOfficial"
//   channel_id - "UC..." (skip the resolve step; use when the channel
//                was resolved on a previous sync)
//   max        - default 50 (YouTube per-page cap), max 200
//
// Two YouTube API calls per sync:
//   1) channels.list?forHandle=<handle>  (1 quota unit; skipped if
//      channel_id provided)  → returns id + contentDetails.
//      relatedPlaylists.uploads (the auto-uploads playlist).
//   2) playlistItems.list?playlistId=<uploads>  (1 quota unit per page)
//
// Server-side upsert into youtube_videos by video_id — safe to run
// repeatedly, existing rows update non-metric fields (title, thumb).
// We do NOT overwrite view_count etc. because those are engagement
// metrics maintained elsewhere.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody { handle?: string; channel_id?: string; max?: number }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isoDurationToShort(iso: string | undefined): string | null {
  if (!iso) return null;
  // PT1H23M45S / PT4M12S / PT30S
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const h = parseInt(m[1] || "0", 10);
  const min = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  if (h > 0) return `${h}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${min}:${String(s).padStart(2, "0")}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return json({ error: "YOUTUBE_API_KEY not configured" }, 503);

  const body = (await req.json().catch(() => ({}))) as ReqBody;
  let channelId = (body.channel_id || "").trim();
  const rawHandle = (body.handle || "").trim();
  const handle = rawHandle.replace(/^@/, "");
  const max = Math.max(1, Math.min(200, body.max ?? 50));

  if (!channelId && !handle) return json({ error: "handle or channel_id required" }, 400);

  // 1) Resolve handle → channel + uploads playlist (or fetch channel by id)
  let uploadsPlaylistId = "";
  let resolvedTitle = "";
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "snippet,contentDetails");
    if (channelId) url.searchParams.set("id", channelId);
    else url.searchParams.set("forHandle", `@${handle}`);
    url.searchParams.set("key", apiKey);
    const r = await fetch(url);
    if (!r.ok) {
      const body = await r.text();
      return json({ error: `channels.list failed: ${r.status} ${body}` }, 502);
    }
    const data = await r.json();
    const item = data.items?.[0];
    if (!item) return json({ error: "Channel not found — check the handle" }, 404);
    channelId = item.id;
    resolvedTitle = item.snippet?.title || "";
    uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads || "";
    if (!uploadsPlaylistId) return json({ error: "Channel has no uploads playlist" }, 404);
  } catch (e) {
    return json({ error: `Resolve failed: ${(e as Error).message}` }, 502);
  }

  // 2) List uploads (paginated to `max`)
  const items: Array<{
    videoId: string;
    title: string;
    description: string;
    thumbnail: string;
    publishedAt: string;
  }> = [];
  let pageToken = "";
  try {
    while (items.length < max) {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      url.searchParams.set("part", "snippet,contentDetails");
      url.searchParams.set("playlistId", uploadsPlaylistId);
      url.searchParams.set("maxResults", String(Math.min(50, max - items.length)));
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      url.searchParams.set("key", apiKey);
      const r = await fetch(url);
      if (!r.ok) return json({ error: `playlistItems.list failed: ${r.status}` }, 502);
      const data = await r.json();
      for (const it of data.items || []) {
        const videoId = it.contentDetails?.videoId || it.snippet?.resourceId?.videoId;
        if (!videoId) continue;
        items.push({
          videoId,
          title: it.snippet?.title || videoId,
          description: it.snippet?.description || "",
          thumbnail: it.snippet?.thumbnails?.medium?.url
            || it.snippet?.thumbnails?.default?.url
            || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          publishedAt: it.snippet?.publishedAt || new Date().toISOString(),
        });
      }
      pageToken = data.nextPageToken || "";
      if (!pageToken) break;
    }
  } catch (e) {
    return json({ error: `Uploads fetch failed: ${(e as Error).message}` }, 502);
  }

  // 3) Fetch durations in batches of 50 via videos.list (1 quota unit each)
  const durations: Record<string, string | null> = {};
  try {
    for (let i = 0; i < items.length; i += 50) {
      const slice = items.slice(i, i + 50);
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "contentDetails");
      url.searchParams.set("id", slice.map((x) => x.videoId).join(","));
      url.searchParams.set("key", apiKey);
      const r = await fetch(url);
      if (!r.ok) break; // best-effort — durations are cosmetic
      const data = await r.json();
      for (const v of data.items || []) {
        durations[v.id] = isoDurationToShort(v.contentDetails?.duration);
      }
    }
  } catch { /* durations are best-effort */ }

  // 4) Upsert into youtube_videos. RLS is service_role via edge function.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500);
  const admin = createClient(supabaseUrl, serviceKey);

  let inserted = 0;
  let updated = 0;
  for (const it of items) {
    const row = {
      video_id: it.videoId,
      channel_id: null as string | null,
      title: it.title,
      description: it.description,
      thumbnail_url: it.thumbnail,
      video_url: `https://www.youtube.com/watch?v=${it.videoId}`,
      published_at: it.publishedAt,
      duration: durations[it.videoId] ?? null,
    };
    // upsert by video_id; do not overwrite view_count/tags/category if set.
    const { data: existing } = await admin
      .from("youtube_videos")
      .select("id")
      .eq("video_id", it.videoId)
      .maybeSingle();
    if (existing) {
      const { error } = await admin
        .from("youtube_videos")
        .update({
          title: row.title,
          description: row.description,
          thumbnail_url: row.thumbnail_url,
          video_url: row.video_url,
          duration: row.duration,
        })
        .eq("id", existing.id);
      if (!error) updated++;
    } else {
      const { error } = await admin.from("youtube_videos").insert(row);
      if (!error) inserted++;
    }
  }

  return json({
    channel_id: channelId,
    channel_title: resolvedTitle,
    fetched: items.length,
    inserted,
    updated,
  });
});
