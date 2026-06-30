// Server-side YouTube search — proxies the YouTube Data API v3 search
// endpoint so the client never sees the API key + so we can rate-limit
// + cache later if quota becomes a concern.
//
// Each request costs ~100 quota units. Default free tier is 10,000/day
// = 100 searches/day across all users of the platform. Bump quota or
// add caching if liturgy planning hits that ceiling.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody { q?: string; maxResults?: number }
interface Hit {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  thumbnail: string;       // 320×180 mq if available, else default
  url: string;             // https://www.youtube.com/watch?v=...
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    return json({
      error: "YOUTUBE_API_KEY not configured on the server",
      help: "Set YOUTUBE_API_KEY in /opt/supabase/.env then recreate the supabase-edge-functions container",
    }, 503);
  }

  let payload: ReqBody;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const q = (payload.q ?? "").trim();
  if (!q) return json({ error: "Missing search query 'q'" }, 400);
  const maxResults = Math.min(25, Math.max(1, Math.floor(payload.maxResults ?? 8)));

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("q", q);
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("key", apiKey);

  const upstream = await fetch(url.toString());
  if (!upstream.ok) {
    const body = await upstream.text();
    return json({ error: `YouTube ${upstream.status}`, detail: body.slice(0, 300) }, 502);
  }
  const data = await upstream.json() as {
    items?: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        publishedAt: string;
        description: string;
        thumbnails: Record<string, { url: string }>;
      };
    }>;
  };

  const hits: Hit[] = (data.items ?? []).map((it) => ({
    videoId: it.id.videoId,
    title: it.snippet.title,
    channelTitle: it.snippet.channelTitle,
    publishedAt: it.snippet.publishedAt,
    description: it.snippet.description,
    thumbnail:
      it.snippet.thumbnails?.medium?.url
      ?? it.snippet.thumbnails?.high?.url
      ?? it.snippet.thumbnails?.default?.url
      ?? "",
    url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
  }));

  return json({ q, hits }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
