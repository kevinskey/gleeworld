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
    const audioFile = formData.get('audio') as File
    
    console.log('Form data received:', {
      audioFileName: audioFile?.name,
      audioFileSize: audioFile?.size,
      audioFileType: audioFile?.type,
      hasAudioFile: !!audioFile
    })

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided in form data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create new FormData for the droplet server
    const serverFormData = new FormData()
    serverFormData.append('audio', audioFile, audioFile.name)

    console.log('Forwarding to analysis server...')

    // Forward the request to your droplet server
    const response = await fetch('http://134.199.204.155:4000/analyze', {
      method: 'POST',
      body: serverFormData,
    })

    console.log('Response received from analysis server:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      // Get the error response body for better debugging
      let errorDetails = 'Unknown error'
      try {
        const errorText = await response.text()
        console.log('Error response body:', errorText)
        errorDetails = errorText
      } catch (e) {
        console.log('Could not read error response body')
        errorDetails = `HTTP ${response.status}: ${response.statusText}`
      }

      // Return the actual error details to the frontend
      return new Response(
        JSON.stringify({ 
          error: `Droplet server error (${response.status})`,
          serverResponse: errorDetails,
          status: response.status,
          statusText: response.statusText
        }),
        { 
          status: 200, // Return 200 so the frontend can see the error details
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
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