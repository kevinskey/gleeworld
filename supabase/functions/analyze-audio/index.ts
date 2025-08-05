import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Audio analysis request received, method:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

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

  try {
    console.log('Processing POST request...')
    
    // Get the form data from the request
    let formData
    try {
      formData = await req.formData()
      console.log('FormData parsed successfully')
    } catch (e) {
      console.error('Error parsing FormData:', e)
      return new Response(
        JSON.stringify({ error: 'Failed to parse form data', details: e.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const audioFile = formData.get('audio') as File
    
    console.log('Form data parsed:', {
      audioFileName: audioFile?.name,
      audioFileSize: audioFile?.size,
      audioFileType: audioFile?.type,
      hasAudioFile: !!audioFile
    })

    if (!audioFile) {
      console.log('No audio file found in form data')
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

    console.log('Forwarding to droplet server at 134.199.204.155:4000/analyze...')

    // Forward the request to your droplet server
    let response
    try {
      response = await fetch('http://134.199.204.155:4000/analyze', {
        method: 'POST',
        body: serverFormData,
      })
      console.log('Droplet server response received:', response.status, response.statusText)
    } catch (e) {
      console.error('Error connecting to droplet server:', e)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect to analysis server',
          details: e.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!response.ok) {
      // Get the error response body for better debugging
      let errorDetails = 'Unknown error'
      try {
        const errorText = await response.text()
        console.log('Droplet server error response:', errorText)
        errorDetails = errorText
      } catch (e) {
        console.log('Could not read error response body')
        errorDetails = `HTTP ${response.status}: ${response.statusText}`
      }

      // Return the error details to the frontend
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

    let result
    try {
      result = await response.json()
      console.log('Analysis completed successfully')
    } catch (e) {
      console.error('Error parsing droplet server response:', e)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse analysis results',
          details: e.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in edge function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})