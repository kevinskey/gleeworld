import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL sanitizer: replace IP addresses with domain
function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Replace the server IP with the domain
  return url
    .replace(/https?:\/\/134\.199\.204\.155/g, 'https://radio.gleeworld.org')
    .replace(/http:\/\/134\.199\.204\.155/g, 'https://radio.gleeworld.org');
}

interface AzuraCastMount {
  id: number;
  name: string;
  url: string;
  is_default: boolean;
}

interface AzuraCastStation {
  id: number;
  name: string;
  shortcode: string;
  description: string | null;
  listen_url: string;
  hls_url?: string;
  hls_enabled?: boolean;
  is_public: boolean;
  mounts?: AzuraCastMount[];
}

interface ChannelData {
  name: string;
  description: string | null;
  stream_url: string;
  hls_url: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  external_provider: string;
  external_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Radio Station Sync: Request received');

    // Get secrets
    const azuracastApiKey = Deno.env.get('AZURACAST_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!azuracastApiKey) {
      console.error('Radio Station Sync: AZURACAST_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AzuraCast API key not configured', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin permissions
    const { data: profile } = await supabase
      .from('gw_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin permissions required', success: false }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Radio Station Sync: Fetching stations from AzuraCast');

    // Fetch stations from AzuraCast
    const azuraResponse = await fetch('https://radio.gleeworld.org/api/stations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${azuracastApiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'GleeWorld-Sync/1.0',
      },
    });

    if (!azuraResponse.ok) {
      const errorText = await azuraResponse.text();
      console.error('Radio Station Sync: AzuraCast API error:', azuraResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `AzuraCast API error: ${azuraResponse.status}`, 
          details: errorText,
          success: false 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stations: AzuraCastStation[] = await azuraResponse.json();
    console.log('Radio Station Sync: Fetched', stations.length, 'stations');

    // Get existing channels to determine sort order
    const { data: existingChannels } = await supabase
      .from('gw_radio_channels')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);

    let maxSortOrder = existingChannels?.[0]?.sort_order ?? 0;

    const results = {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each station
    for (const station of stations) {
      try {
        // Determine the best stream URL
        let streamUrl = sanitizeUrl(station.listen_url);
        
        // Fallback to default mount if listen_url is missing or IP-based
        if (!streamUrl || streamUrl.includes('134.199.204.155')) {
          const defaultMount = station.mounts?.find(m => m.is_default);
          if (defaultMount?.url) {
            streamUrl = sanitizeUrl(defaultMount.url);
          }
        }

        // Final fallback: construct URL from shortcode
        if (!streamUrl) {
          streamUrl = `https://radio.gleeworld.org/listen/${station.shortcode || station.id}/radio.mp3`;
        }

        // Sanitize HLS URL
        const hlsUrl = station.hls_enabled ? sanitizeUrl(station.hls_url) : null;

        const externalId = String(station.id);

        // Check if channel exists
        const { data: existing } = await supabase
          .from('gw_radio_channels')
          .select('id, sort_order')
          .eq('external_provider', 'azuracast')
          .eq('external_id', externalId)
          .maybeSingle();

        const channelData: Partial<ChannelData> = {
          name: station.name,
          description: station.description || null,
          stream_url: streamUrl,
          hls_url: hlsUrl,
          is_active: station.is_public !== false,
          external_provider: 'azuracast',
          external_id: externalId,
        };

        if (existing) {
          // Update existing channel
          const { error: updateError } = await supabase
            .from('gw_radio_channels')
            .update({
              ...channelData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('Radio Station Sync: Update error for', station.name, updateError);
            results.errors.push(`Update failed for ${station.name}: ${updateError.message}`);
          } else {
            results.updated++;
            console.log('Radio Station Sync: Updated', station.name);
          }
        } else {
          // Insert new channel
          maxSortOrder++;
          const { error: insertError } = await supabase
            .from('gw_radio_channels')
            .insert({
              ...channelData,
              icon: 'Radio',
              color: '#7BAFD4',
              is_default: false,
              sort_order: maxSortOrder,
            });

          if (insertError) {
            console.error('Radio Station Sync: Insert error for', station.name, insertError);
            results.errors.push(`Insert failed for ${station.name}: ${insertError.message}`);
          } else {
            results.added++;
            console.log('Radio Station Sync: Added', station.name);
          }
        }
      } catch (stationError) {
        const errorMsg = stationError instanceof Error ? stationError.message : 'Unknown error';
        console.error('Radio Station Sync: Error processing station', station.name, stationError);
        results.errors.push(`Error processing ${station.name}: ${errorMsg}`);
      }
    }

    console.log('Radio Station Sync: Complete', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${stations.length} stations. Added: ${results.added}, Updated: ${results.updated}`,
        total: stations.length,
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Radio Station Sync: Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
