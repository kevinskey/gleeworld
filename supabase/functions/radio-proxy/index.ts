
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

    // Validate the stream URL
    let targetUrl: URL
    try {
      targetUrl = new URL(streamUrl)
      console.log(`Parsed target URL: ${targetUrl.href}`)
    } catch (error) {
      console.error(`Invalid stream URL: ${streamUrl}`, error)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid stream URL format',
          streamUrl: streamUrl 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Fetching stream from: ${targetUrl.href}`)

    // Forward Range header for streaming compatibility
    const forwardedHeaders: Record<string, string> = {
      'User-Agent': 'GleeWorld-Radio-Player/1.0',
      'Accept': '*/*',
    }
    
    const rangeHeader = req.headers.get('range') || req.headers.get('Range')
    if (rangeHeader) {
      console.log(`Forwarding Range header: ${rangeHeader}`)
      forwardedHeaders['Range'] = rangeHeader
    }

    const response = await fetch(targetUrl.href, { 
      headers: forwardedHeaders,
      redirect: 'follow'
    })

    console.log(`Stream response status: ${response.status}`)
    console.log(`Stream content-type: ${response.headers.get('content-type')}`)

    if (!response.ok) {
      console.error(`Stream fetch failed: ${response.status} ${response.statusText}`)
      return new Response(
        JSON.stringify({ 
          error: `Stream unavailable: ${response.status} ${response.statusText}`,
          streamUrl: targetUrl.href 
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create response headers
    const responseHeaders = new Headers(corsHeaders)
    
    // Copy essential headers from the upstream response
    const contentType = response.headers.get('content-type')
    if (contentType) {
      responseHeaders.set('content-type', contentType)
      console.log(`Setting content-type: ${contentType}`)
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      responseHeaders.set('content-length', contentLength)
      console.log(`Setting content-length: ${contentLength}`)
    }

    const acceptRanges = response.headers.get('accept-ranges')
    if (acceptRanges) {
      responseHeaders.set('accept-ranges', acceptRanges)
      console.log(`Setting accept-ranges: ${acceptRanges}`)
    }

    const contentRange = response.headers.get('content-range')
    if (contentRange) {
      responseHeaders.set('content-range', contentRange)
      console.log(`Setting content-range: ${contentRange}`)
    }

    // Set cache headers for audio streams
    responseHeaders.set('Cache-Control', 'no-cache')
    responseHeaders.set('X-Proxy-By', 'GleeWorld-Radio-Proxy')

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
    console.error('Radio proxy error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to proxy radio stream',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
