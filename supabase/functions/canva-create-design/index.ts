import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CanvaDesignRequest {
  title: string;
  width?: number;
  height?: number;
  templateId?: string;
}

async function getCanvaAccessToken(): Promise<string> {
  const clientId = Deno.env.get('CANVA_CLIENT_ID');
  const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET');
  const apiKey = Deno.env.get('CANVA_API_KEY');

  // If API key is provided, use it directly (for API key auth)
  if (apiKey && !clientId && !clientSecret) {
    return apiKey;
  }

  // Otherwise use OAuth flow
  if (!clientId || !clientSecret) {
    throw new Error('Missing Canva credentials. Please configure either CANVA_API_KEY or both CANVA_CLIENT_ID and CANVA_CLIENT_SECRET');
  }

  console.log('Getting Canva access token via OAuth...');

  const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('OAuth token error:', tokenResponse.status, errorText);
    throw new Error(`Failed to get Canva access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get access token
    const accessToken = await getCanvaAccessToken();

    // Parse request body
    const { title, width = 2550, height = 3300, templateId }: CanvaDesignRequest = await req.json();

    console.log('Creating Canva design:', { title, width, height, templateId });

    // Create a new design in Canva
    const canvaResponse = await fetch('https://api.canva.com/rest/v1/designs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        asset_type: 'Document',
        title: title || 'Alumnae Newsletter',
        width_px: width,
        height_px: height,
        ...(templateId && { template_id: templateId })
      })
    });

    if (!canvaResponse.ok) {
      const errorText = await canvaResponse.text();
      console.error('Canva API error:', canvaResponse.status, errorText);
      
      if (canvaResponse.status === 401) {
        throw new Error('Invalid Canva API credentials. Please check your API key or OAuth credentials.');
      } else if (canvaResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Canva API error: ${errorText}`);
    }

    const designData = await canvaResponse.json();
    console.log('Canva design created:', designData);

    // Return the design information including edit URL
    return new Response(
      JSON.stringify({
        success: true,
        design: {
          id: designData.design?.id,
          title: designData.design?.title,
          editUrl: designData.design?.urls?.edit_url,
          viewUrl: designData.design?.urls?.view_url,
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Error in canva-create-design:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to create Canva design' 
      }),
      { 
        status: error.message?.includes('credentials') ? 401 : 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});