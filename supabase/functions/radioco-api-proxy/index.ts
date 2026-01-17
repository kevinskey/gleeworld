import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const RADIOCO_STATION_ID = 'sd0d2e77cf';
const RADIOCO_STATUS_URL = `https://public.radio.co/stations/${RADIOCO_STATION_ID}/status`;

serve(async (req) => {
  console.log(`Radio.co API proxy request: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'status';

    console.log(`Fetching Radio.co endpoint: ${endpoint}`);

    // Currently only status endpoint is supported
    if (endpoint === 'status' || endpoint === 'now-playing') {
      const response = await fetch(RADIOCO_STATUS_URL, {
        headers: {
          'User-Agent': 'GleeWorld-Radio/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Radio.co API error: ${response.status}`);
        return new Response(
          JSON.stringify({ 
            error: 'Radio.co API unavailable',
            status: response.status 
          }),
          { 
            status: 502, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const data = await response.json();
      console.log('Radio.co status fetched successfully');

      // Transform to a format compatible with our existing player
      const transformed = {
        success: true,
        station: {
          id: RADIOCO_STATION_ID,
          name: 'GleeWorld Radio',
          status: data.status,
          logo_url: data.logo_url,
        },
        now_playing: data.current_track ? {
          song: {
            title: data.current_track.title || 'Unknown Track',
            artist: '', // Radio.co combines artist+title in one field
            art: data.current_track.artwork_url_large || data.current_track.artwork_url || '',
          },
          started_at: data.current_track.start_time,
        } : null,
        is_live: data.source?.type === 'live',
        streamer_name: data.source?.collaborator || null,
        history: data.history || [],
      };

      return new Response(
        JSON.stringify(transformed),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown endpoint' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Radio.co proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch Radio.co data',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
