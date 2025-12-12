import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  console.log(`AzuraCast webhook: ${req.method} ${req.url}`)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests for webhook data
    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method)
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse the webhook payload
    const payload = await req.json()
    console.log('AzuraCast webhook payload received:', JSON.stringify(payload, null, 2))

    // Extract key information from the webhook
    const {
      station,
      listeners,
      live,
      now_playing,
      playing_next,
      song_history
    } = payload

    // Determine event type based on the webhook trigger
    const eventType = determineEventType(payload)
    
    // Log the important data points
    console.log('Event Type:', eventType)
    console.log('Station Info:', {
      name: station?.name,
      shortcode: station?.shortcode,
      is_public: station?.is_public
    })

    console.log('Live Status:', {
      is_live: live?.is_live,
      streamer_name: live?.streamer_name
    })

    console.log('Listener Count:', listeners?.current || 0)

    console.log('Now Playing:', {
      title: now_playing?.song?.title,
      artist: now_playing?.song?.artist,
      album: now_playing?.song?.album,
      art: now_playing?.song?.art
    })

    // Update database with real-time station state
    const updateData = {
      station_id: station?.shortcode || 'glee_world_radio',
      station_name: station?.name || 'Glee World Radio',
      is_online: determineOnlineStatus(eventType, payload),
      is_live: live?.is_live || false,
      streamer_name: live?.streamer_name || null,
      listener_count: listeners?.current || 0,
      current_song_title: now_playing?.song?.title || null,
      current_song_artist: now_playing?.song?.artist || null,
      current_song_album: now_playing?.song?.album || null,
      current_song_art: now_playing?.song?.art || null,
      song_started_at: now_playing?.song ? new Date().toISOString() : null,
      last_event_type: eventType,
      last_updated: new Date().toISOString()
    }

    console.log('Updating database with:', updateData)

    // Upsert the station state
    const { data, error } = await supabase
      .from('gw_radio_station_state')
      .upsert(updateData, { 
        onConflict: 'station_id',
        ignoreDuplicates: false 
      })
      .select()

    if (error) {
      console.error('Database update error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update station state',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Database updated successfully:', data)
    
    // Respond with success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        timestamp: new Date().toISOString(),
        station: station?.shortcode || 'unknown',
        event_type: eventType,
        updated_data: updateData
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('AzuraCast webhook error:', error.message)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process webhook',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Helper function to determine event type from webhook payload
function determineEventType(payload: any): string {
  // AzuraCast doesn't explicitly send event type, so we infer it
  // from the payload structure and data changes
  if (payload.live?.is_live && payload.live?.streamer_name) {
    return 'live_streamer_connected'
  } else if (payload.live?.is_live === false && !payload.live?.streamer_name) {
    return 'live_streamer_disconnected'
  } else if (payload.now_playing?.song) {
    return 'song_change'
  } else if (payload.listeners?.current !== undefined) {
    return 'listener_change'
  } else {
    return 'station_update'
  }
}

// Helper function to determine if station is online
function determineOnlineStatus(eventType: string, payload: any): boolean {
  if (eventType === 'station_offline') return false
  if (eventType === 'station_online') return true
  
  // If we have current playing data or listeners, assume online
  return !!(payload.now_playing?.song || payload.listeners?.current >= 0)
}