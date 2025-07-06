import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    
    if (!googleVisionApiKey) {
      console.error('Google Vision API key not found');
      return new Response(
        JSON.stringify({ error: 'Google Vision API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    // Call Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Data,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Google Vision API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to process image with Google Vision API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visionData = await visionResponse.json();
    
    if (!visionData.responses || !visionData.responses[0]) {
      return new Response(
        JSON.stringify({ error: 'No text detected in image' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const textAnnotations = visionData.responses[0].textAnnotations;
    const fullText = textAnnotations && textAnnotations[0] ? textAnnotations[0].description : '';

    // Extract W9 form data using simple text parsing
    const extractedData = extractW9Data(fullText);

    return new Response(
      JSON.stringify({
        success: true,
        extractedData,
        rawText: fullText,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in w9-ocr-extract function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractW9Data(text: string) {
  const data: any = {};
  
  if (!text) return data;

  const lines = text.split('\n').map(line => line.trim());
  const allText = text.toLowerCase();

  // Extract name (look for "name" field or first substantial text)
  const namePatterns = [
    /name[:\s]+([a-zA-Z\s]+)/i,
    /^([A-Z][a-z]+\s+[A-Z][a-z]+)/m,
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      data.name = match[1].trim();
      break;
    }
  }

  // Extract business name
  const businessPatterns = [
    /business name[:\s]+([^\n]+)/i,
    /company[:\s]+([^\n]+)/i,
  ];
  
  for (const pattern of businessPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      data.business_name = match[1].trim();
      break;
    }
  }

  // Extract address
  const addressPatterns = [
    /address[:\s]+([^\n]+)/i,
    /street[:\s]+([^\n]+)/i,
  ];
  
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 5) {
      data.address = match[1].trim();
      break;
    }
  }

  // Extract SSN or EIN
  const ssnPattern = /(\d{3}[-\s]?\d{2}[-\s]?\d{4})/;
  const einPattern = /(\d{2}[-\s]?\d{7})/;
  
  const ssnMatch = text.match(ssnPattern);
  const einMatch = text.match(einPattern);
  
  if (ssnMatch) {
    data.ssn = ssnMatch[1].replace(/[-\s]/g, '');
  }
  
  if (einMatch) {
    data.ein = einMatch[1].replace(/[-\s]/g, '');
  }

  // Extract city, state, zip
  const cityStateZipPattern = /([A-Za-z\s]+),\s*([A-Z]{2})\s+(\d{5})/;
  const match = text.match(cityStateZipPattern);
  if (match) {
    data.city = match[1].trim();
    data.state = match[2];
    data.zip = match[3];
  }

  // Try to find checkbox selections (Individual, LLC, etc.)
  const taxClassifications = ['individual', 'llc', 'corporation', 'partnership', 's corporation'];
  for (const classification of taxClassifications) {
    if (allText.includes(classification)) {
      data.tax_classification = classification;
      break;
    }
  }

  return data;
}