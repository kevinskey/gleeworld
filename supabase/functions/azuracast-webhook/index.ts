import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

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

    // Log the important data points
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

    // Here you could store this data in your database if needed
    // For now, we'll just acknowledge receipt of the webhook
    
    // Respond with success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received successfully',
        timestamp: new Date().toISOString(),
        station: station?.shortcode || 'unknown'
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