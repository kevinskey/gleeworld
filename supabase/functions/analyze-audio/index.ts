import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Audio analysis request received')

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the form data from the request
    const formData = await req.formData()
    console.log('Form data received, forwarding to analysis server...')

    // Forward the request to your droplet server
    const response = await fetch('http://134.199.204.155:4000/analyze', {
      method: 'POST',
      body: formData,
    })

    console.log('Response received from analysis server:', response.status)

    if (!response.ok) {
      throw new Error(`Analysis server responded with status: ${response.status}`)
    }

    const result = await response.json()
    console.log('Analysis completed successfully')

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in audio analysis:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze audio', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})