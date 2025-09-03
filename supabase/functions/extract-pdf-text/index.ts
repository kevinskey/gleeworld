import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    // For now, we'll return a placeholder response
    // In a production environment, you would use a PDF parsing library
    // like pdf-parse or send the file to an OCR service
    
    const placeholder = `This is a placeholder for PDF text extraction.
    
File: ${file.name}
Size: ${file.size} bytes
Type: ${file.type}

In a full implementation, this would extract the actual text content from the PDF file.
For the demo, you can manually paste text content or use text files instead.`;

    return new Response(JSON.stringify({ 
      text: placeholder,
      filename: file.name,
      size: file.size 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});