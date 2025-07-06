import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface W9Data {
  name?: string;
  businessName?: string;
  taxClassification?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  ssn?: string;
  ein?: string;
}

function extractW9Data(text: string): W9Data {
  const data: W9Data = {};
  
  // Extract name (look for "Name" field)
  const nameMatch = text.match(/Name[:\s]*([A-Za-z\s,.-]+)/i);
  if (nameMatch) {
    data.name = nameMatch[1].trim().replace(/[,.-]*$/, '');
  }
  
  // Extract business name
  const businessMatch = text.match(/Business name[:\s]*([A-Za-z\s&,.-]+)/i);
  if (businessMatch) {
    data.businessName = businessMatch[1].trim().replace(/[,.-]*$/, '');
  }
  
  // Extract address
  const addressMatch = text.match(/Address[:\s]*([0-9A-Za-z\s,.-]+)/i);
  if (addressMatch) {
    data.address = addressMatch[1].trim().replace(/[,.-]*$/, '');
  }
  
  // Extract city, state, zip
  const cityStateZipMatch = text.match(/City[:\s]*([A-Za-z\s]+)[,\s]*State[:\s]*([A-Za-z]{2})[,\s]*ZIP[:\s]*([0-9-]+)/i);
  if (cityStateZipMatch) {
    data.city = cityStateZipMatch[1].trim();
    data.state = cityStateZipMatch[2].trim();
    data.zipCode = cityStateZipMatch[3].trim();
  }
  
  // Extract SSN
  const ssnMatch = text.match(/(?:SSN|Social Security)[:\s]*([0-9-]{9,11})/i);
  if (ssnMatch) {
    data.ssn = ssnMatch[1].replace(/[^0-9]/g, '');
  }
  
  // Extract EIN
  const einMatch = text.match(/(?:EIN|Employer ID)[:\s]*([0-9-]{9,11})/i);
  if (einMatch) {
    data.ein = einMatch[1].replace(/[^0-9]/g, '');
  }
  
  // Extract tax classification
  const taxClassMatch = text.match(/(?:Individual|LLC|Corporation|Partnership|Trust)/i);
  if (taxClassMatch) {
    data.taxClassification = taxClassMatch[0].toLowerCase();
  }
  
  return data;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    console.log('Processing W9 OCR request...');

    // Call Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${Deno.env.get('GOOGLE_VISION_API_KEY')}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
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
      throw new Error(`Google Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    console.log('Vision API response received');

    if (visionData.responses?.[0]?.error) {
      throw new Error(`Vision API error: ${visionData.responses[0].error.message}`);
    }

    const detectedText = visionData.responses?.[0]?.fullTextAnnotation?.text || '';
    console.log('Detected text length:', detectedText.length);

    // Extract W9 specific data
    const extractedData = extractW9Data(detectedText);
    console.log('Extracted W9 data:', extractedData);

    return new Response(
      JSON.stringify({
        success: true,
        extractedData,
        rawText: detectedText,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in w9-ocr-extract function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});