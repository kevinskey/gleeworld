import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SOUNDCLOUD_CLIENT_ID = Deno.env.get("SOUNDCLOUD_CLIENT_ID")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { q = "choir" } = await req.json();

  const scUrl =
    `https://api-v2.soundcloud.com/search/tracks` +
    `?q=${encodeURIComponent(q)}` +
    `&client_id=${SOUNDCLOUD_CLIENT_ID}` +
    `&limit=20`;

  const scRes = await fetch(scUrl);
  if (!scRes.ok) {
    return new Response(
      JSON.stringify({ error: "SoundCloud request failed", status: scRes.status }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const data = await scRes.json();

  const tracks = (data.collection ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    artist: t.user?.username,
    artwork: t.artwork_url,
    url: t.permalink_url,
    duration_ms: t.duration,
  }));

  return new Response(JSON.stringify({ tracks }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
