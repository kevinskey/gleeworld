import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const streamUrl = url.searchParams.get('url')

    if (!streamUrl) {
      console.error('Missing stream URL parameter')
      return new Response(
        JSON.stringify({ error: 'Missing stream URL parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Attempting to proxy radio stream: ${streamUrl}`)

    // Test if the stream URL is reachable first
    let response
    try {
      // Fetch the radio stream with timeout and proper headers
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.error(`Timeout reached for stream: ${streamUrl}`)
        controller.abort()
      }, 15000) // 15 second timeout

      response = await fetch(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GleeWorld Radio Player)',
          'Accept': 'audio/*,*/*;q=0.1',
          'Range': req.headers.get('range') || '',
          'Connection': 'keep-alive',
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log(`Stream response status: ${response.status}`)
      console.log(`Stream response headers:`, Object.fromEntries(response.headers.entries()))
      
    } catch (fetchError) {
      console.error(`Fetch error for ${streamUrl}:`, fetchError)
      
      // Return a more helpful error response
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch radio stream',
          details: fetchError.message,
          streamUrl: streamUrl,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!response.ok) {
      console.error(`Stream returned status ${response.status}: ${response.statusText}`)
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
    
    // Copy important headers from the original response
    const headersToProxy = [
      'content-type',
      'content-length', 
      'content-range',
      'accept-ranges',
      'cache-control',
      'icy-br',
      'icy-description',
      'icy-genre',
      'icy-name',
      'icy-pub',
      'icy-url',
      'icy-metaint'
    ]

    headersToProxy.forEach(header => {
      const value = response.headers.get(header)
      if (value) {
        responseHeaders.set(header, value)
      }
    })

    console.log(`Successfully proxying stream. Content-Type: ${response.headers.get('content-type')}`)

    // Return the proxied stream
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    })

  } catch (error) {
    console.error('Radio proxy error:', error)
    
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