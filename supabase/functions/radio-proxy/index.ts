import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  console.log(`Radio proxy request: ${req.method} ${req.url}`)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const streamUrl = url.searchParams.get('url')

    console.log(`Stream URL parameter: ${streamUrl}`)

    if (!streamUrl) {
      console.error('No stream URL provided')
      return new Response(
        JSON.stringify({ error: 'Missing stream URL parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Fetching stream from: ${streamUrl}`)

    // Simple fetch with basic headers
    const response = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'GleeWorld-Radio-Player',
        'Accept': '*/*',
      }
    })

    console.log(`Stream response status: ${response.status}`)
    console.log(`Stream content-type: ${response.headers.get('content-type')}`)

    if (!response.ok) {
      console.error(`Stream fetch failed: ${response.status} ${response.statusText}`)
      return new Response(
        JSON.stringify({ 
          error: `Stream unavailable: ${response.status} ${response.statusText}`,
          streamUrl: streamUrl 
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create response headers
    const responseHeaders = new Headers(corsHeaders)
    
    // Copy essential headers
    const contentType = response.headers.get('content-type')
    if (contentType) {
      responseHeaders.set('content-type', contentType)
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      responseHeaders.set('content-length', contentLength)
    }

    console.log(`Proxying stream successfully`)

    // Return the proxied stream
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    })

  } catch (error) {
    console.error('Radio proxy error:', error.message)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to proxy radio stream',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})