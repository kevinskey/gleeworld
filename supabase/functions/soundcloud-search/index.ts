import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const { q = "choir" } = await req.json();

    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's SoundCloud access token
    const { data: tokenData, error: tokenError } = await supabase
      .from('soundcloud_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ 
          error: "SoundCloud not connected",
          needsAuth: true 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Searching SoundCloud with user token');

    // Use public API v1 endpoint for search
    const scUrl = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(q)}&limit=20`;

    const scRes = await fetch(scUrl, {
      headers: {
        'Authorization': `OAuth ${tokenData.access_token}`,
      }
    });

    if (!scRes.ok) {
      console.error('SoundCloud API error:', scRes.status, await scRes.text());
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
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
