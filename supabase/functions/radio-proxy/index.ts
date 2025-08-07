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
      return new Response(
        JSON.stringify({ error: 'Missing stream URL parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Proxying radio stream: ${streamUrl}`)

    // Fetch the radio stream with timeout and proper headers
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GleeWorld Radio Player)',
        'Accept': 'audio/*,*/*;q=0.1',
        'Range': req.headers.get('range') || '',
        'Connection': 'keep-alive',
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId))

    if (!response.ok) {
      throw new Error(`Stream fetch failed: ${response.status} ${response.statusText}`)
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

    console.log(`Stream response status: ${response.status}`)
    console.log(`Content-Type: ${response.headers.get('content-type')}`)

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