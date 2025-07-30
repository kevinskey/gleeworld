import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting HEIC to JPEG conversion')
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      )
    }

    // Get the form data containing the HEIC file
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`)

    // Check if it's a HEIC file
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                   file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')

    if (!isHeic) {
      // If not HEIC, return the original file as base64
      const arrayBuffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          base64: `data:${file.type};base64,${base64}`,
          originalFormat: true,
          filename: file.name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For HEIC files, we'll use a workaround since there's no direct HEIC support in Deno
    // We'll return an error message suggesting the user convert the file manually
    console.log('HEIC file detected, but conversion not supported in this environment')
    
    return new Response(
      JSON.stringify({ 
        error: 'HEIC format detected. Please convert to JPEG or PNG format before uploading.',
        isHeic: true,
        suggestion: 'You can convert HEIC files to JPEG on your device before uploading.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Error in HEIC conversion:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process image', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})