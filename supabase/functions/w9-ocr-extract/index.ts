import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout controller for API calls
const VISION_API_TIMEOUT = 15000; // 15 seconds

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
    
    // Check image size to prevent timeouts
    const imageSizeKB = (base64Data.length * 3) / 4 / 1024;
    console.log(`Processing image of size: ${imageSizeKB.toFixed(2)} KB`);
    
    if (imageSizeKB > 2048) { // 2MB limit
      return new Response(
        JSON.stringify({ error: 'Image too large. Please use an image smaller than 2MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create timeout controller
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), VISION_API_TIMEOUT);

    try {
      // Call Google Vision API with timeout
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
          signal: timeoutController.signal,
        }
      );

      clearTimeout(timeoutId);

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

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Vision API request timed out');
        return new Response(
          JSON.stringify({ error: 'OCR processing timed out. Please try with a smaller image.' }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw fetchError; // Re-throw other errors
    }

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

  console.log('Raw OCR text:', text);
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const allText = text.toLowerCase();

  // More comprehensive name extraction patterns
  const namePatterns = [
    /(?:name|full\s+name)[:\s]*([a-zA-Z](?:[a-zA-Z'\s\-\.]{1,48}[a-zA-Z])?)/i,
    /^(?:1\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+)(?:\s|$)/m,
    /line\s*1[:\s]*([a-zA-Z](?:[a-zA-Z'\s\-\.]{1,48}[a-zA-Z])?)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 2 && !match[1].toLowerCase().includes('business')) {
      data.name = match[1].trim();
      console.log('Extracted name:', data.name);
      break;
    }
  }

  // Business name patterns - look for common W9 business name fields
  const businessPatterns = [
    /(?:business\s+name|company)[:\s]*([^\n\r]{3,})/i,
    /(?:dba|d\.b\.a\.?)[:\s]*([^\n\r]{3,})/i,
    /(?:line\s*2|2\.)[:\s]*([^\n\r]{3,})/i,
  ];
  
  for (const pattern of businessPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      data.business_name = match[1].trim();
      console.log('Extracted business name:', data.business_name);
      break;
    }
  }

  // Address extraction - look for street addresses
  const addressPatterns = [
    /(?:address|street)[:\s]*([^\n\r]*\d+[^\n\r]*)/i,
    /(?:line\s*3|3\.)[:\s]*([^\n\r]*\d+[^\n\r]*)/i,
    /(\d+\s+[a-zA-Z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd))/i,
  ];
  
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 5) {
      data.address = match[1].trim();
      console.log('Extracted address:', data.address);
      break;
    }
  }

  // Enhanced SSN and EIN extraction
  const ssnPattern = /(?:ssn|social\s+security)[:\s]*(\d{3}[-\s]?\d{2}[-\s]?\d{4})/i;
  const einPattern = /(?:ein|employer\s+id)[:\s]*(\d{2}[-\s]?\d{7})/i;
  const taxIdPattern = /(?:tax\s+id)[:\s]*(\d{2,3}[-\s]?\d{2,7}[-\s]?\d{4})/i;
  
  let ssnMatch = text.match(ssnPattern);
  let einMatch = text.match(einPattern);
  let taxIdMatch = text.match(taxIdPattern);
  
  // Fallback to any 9-digit number pattern
  if (!ssnMatch && !einMatch) {
    const numberPattern = /(\d{3}[-\s]?\d{2}[-\s]?\d{4})/;
    ssnMatch = text.match(numberPattern);
  }
  
  if (ssnMatch) {
    data.ssn = ssnMatch[1].replace(/[-\s]/g, '');
    console.log('Extracted SSN:', data.ssn);
  }
  
  if (einMatch) {
    data.ein = einMatch[1].replace(/[-\s]/g, '');
    console.log('Extracted EIN:', data.ein);
  } else if (taxIdMatch) {
    data.ein = taxIdMatch[1].replace(/[-\s]/g, '');
    console.log('Extracted Tax ID as EIN:', data.ein);
  }

  // City, state, zip extraction with more flexible patterns
  const cityStateZipPatterns = [
    /([a-zA-Z\s]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/,
    /(?:city|line\s*4)[:\s]*([^,\n\r]+),?\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i,
  ];
  
  for (const pattern of cityStateZipPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.city = match[1].trim();
      data.state = match[2];
      data.zip = match[3];
      console.log('Extracted location:', { city: data.city, state: data.state, zip: data.zip });
      break;
    }
  }

  // Enhanced tax classification detection
  const taxClassifications = [
    { key: 'individual', patterns: ['individual', 'sole proprietor', 'single member llc'] },
    { key: 'llc', patterns: ['llc', 'limited liability company'] },
    { key: 'corporation', patterns: ['corporation', 'c corp', 'c-corp'] },
    { key: 's-corporation', patterns: ['s corp', 's-corp', 's corporation'] },
    { key: 'partnership', patterns: ['partnership', 'general partnership'] },
    { key: 'trust', patterns: ['trust', 'estate'] },
  ];
  
  for (const classification of taxClassifications) {
    for (const pattern of classification.patterns) {
      if (allText.includes(pattern)) {
        data.tax_classification = classification.key;
        console.log('Extracted tax classification:', data.tax_classification);
        break;
      }
    }
    if (data.tax_classification) break;
  }

  // Look for any filled checkboxes or marked boxes
  const checkboxPatterns = [
    /[x✓✗☑☒]\s*([a-zA-Z\s]+)/gi,
    /\[\s*[x✓]\s*\]\s*([a-zA-Z\s]+)/gi,
  ];
  
  for (const pattern of checkboxPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const checkedItem = match[1].toLowerCase().trim();
      console.log('Found checked item:', checkedItem);
      // Could add logic to map checked items to form fields
    }
  }

  console.log('Final extracted data:', data);
  return data;
}