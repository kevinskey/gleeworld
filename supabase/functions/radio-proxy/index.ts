import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Length, Content-Range, Content-Type',
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

    // Forward Range header for streaming compatibility
    const forwardedHeaders: Record<string, string> = {
      'User-Agent': 'GleeWorld-Radio-Player',
      'Accept': '*/*',
    }
    const rangeHeader = req.headers.get('range') || req.headers.get('Range')
    if (rangeHeader) {
      forwardedHeaders['Range'] = rangeHeader
    }

    const response = await fetch(streamUrl, { headers: forwardedHeaders })

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

    const acceptRanges = response.headers.get('accept-ranges')
    if (acceptRanges) {
      responseHeaders.set('accept-ranges', acceptRanges)
    }

    const contentRange = response.headers.get('content-range')
    if (contentRange) {
      responseHeaders.set('content-range', contentRange)
    }

    // Expose useful headers to the browser
    responseHeaders.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, Content-Type')

    console.log(`Proxying stream successfully`)

    // For HEAD requests, return headers only
    if (req.method === 'HEAD') {
      return new Response(null, {
        status: response.status,
        headers: responseHeaders
      })
    }

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