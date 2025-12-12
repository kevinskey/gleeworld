import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShoutcastStatsResponse {
  listeners: number;
  peak_listeners: number;
  max_listeners: number;
  current_song: string;
  stream_start: string;
  bitrate: number;
  sample_rate: number;
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'POST') {
      const { stream_id, stream_url, admin_password } = await req.json();

      if (!stream_id || !stream_url) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`Fetching stats for stream: ${stream_url}`);

      try {
        // Construct the stats URL (typically /7.html for SHOUTcast)
        const statsUrl = `${stream_url}/7.html`;
        
        // Fetch stats from SHOUTcast server
        const response = await fetch(statsUrl, {
          headers: {
            'User-Agent': 'GleeWorld-Radio-Bot/1.0',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const statsText = await response.text();
        console.log('Raw stats response:', statsText);

        // Parse SHOUTcast stats format (comma-separated values)
        // Format: listeners,status,peak,max,unique,bitrate,title
        const statsArray = statsText.split(',');
        
        if (statsArray.length < 7) {
          throw new Error('Invalid stats response format');
        }

        const stats: ShoutcastStatsResponse = {
          listeners: parseInt(statsArray[0]) || 0,
          status: statsArray[1] === '1' ? 'online' : 'offline',
          peak_listeners: parseInt(statsArray[2]) || 0,
          max_listeners: parseInt(statsArray[3]) || 0,
          // Skip unique listeners (statsArray[4])
          bitrate: parseInt(statsArray[5]) || 0,
          current_song: statsArray[6] || 'No track info',
          stream_start: new Date().toISOString(),
          sample_rate: 44100, // Default, would need to parse from different endpoint
        };

        console.log('Parsed stats:', stats);

        // Store stats in database
        const { error: insertError } = await supabase
          .from('gw_shoutcast_stats')
          .insert({
            stream_id,
            current_listeners: stats.listeners,
            peak_listeners: stats.peak_listeners,
            total_listeners: stats.listeners, // This would need to be accumulated
            current_song: stats.current_song,
            stream_start_time: stats.stream_start,
            bitrate: stats.bitrate,
            sample_rate: stats.sample_rate,
            stream_status: stats.status,
          });

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw insertError;
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            stats,
            message: 'Stats updated successfully'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );

      } catch (fetchError) {
        console.error('Error fetching SHOUTcast stats:', fetchError);
        
        // Store offline status in database
        const { error: insertError } = await supabase
          .from('gw_shoutcast_stats')
          .insert({
            stream_id,
            current_listeners: 0,
            peak_listeners: 0,
            total_listeners: 0,
            current_song: 'Stream Offline',
            bitrate: 0,
            sample_rate: 0,
            stream_status: 'offline',
          });

        if (insertError) {
          console.error('Database insert error for offline status:', insertError);
        }

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: fetchError.message,
            stats: {
              listeners: 0,
              status: 'offline',
              current_song: 'Stream Offline'
            }
          }),
          { 
            status: 200, // Return 200 even for offline streams
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    if (req.method === 'GET') {
      // Get latest stats for all streams
      const { data: streams, error: streamsError } = await supabase
        .from('gw_shoutcast_streams')
        .select('id, name, stream_url, is_active');

      if (streamsError) {
        throw streamsError;
      }

      const { data: latestStats, error: statsError } = await supabase
        .from('gw_shoutcast_stats')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (statsError) {
        throw statsError;
      }

      // Group stats by stream_id and get the latest for each
      const statsMap = new Map();
      latestStats?.forEach(stat => {
        if (!statsMap.has(stat.stream_id)) {
          statsMap.set(stat.stream_id, stat);
        }
      });

      const result = streams?.map(stream => ({
        ...stream,
        latest_stats: statsMap.get(stream.id) || null
      }));

      return new Response(
        JSON.stringify({ streams: result }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Shoutcast stats error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});