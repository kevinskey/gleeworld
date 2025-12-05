import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
const squareAppId = Deno.env.get('SQUARE_APPLICATION_ID');
const squareAppSecret = Deno.env.get('SQUARE_APPLICATION_SECRET');

interface OAuthCallbackRequest {
  code: string;
  state: string;
}

interface TokenRequest {
  action: 'get_auth_url' | 'handle_callback';
  redirectUri: string;
  code?: string;
  state?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Square OAuth request received:', { action: req.url });
    const { action, redirectUri, code, state }: TokenRequest = await req.json();
    console.log('Parsed request:', { action, redirectUri, squareEnvironment, squareAppId: squareAppId ? 'SET' : 'NOT SET' });

    if (action === 'get_auth_url') {
      // Generate OAuth URL for Square authorization
      const authState = crypto.randomUUID();
      const scopes = [
        'MERCHANT_PROFILE_READ',
        'ITEMS_READ',
        'ITEMS_WRITE', 
        'INVENTORY_READ',
        'INVENTORY_WRITE',
        'ORDERS_READ',
        'ORDERS_WRITE'
      ].join(' ');

      const baseUrl = squareEnvironment === 'production' 
        ? 'https://connect.squareup.com/oauth2/authorize'
        : 'https://connect.squareupsandbox.com/oauth2/authorize';

      const authUrl = new URL(baseUrl);
      authUrl.searchParams.set('client_id', squareAppId!);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('session', 'false');
      authUrl.searchParams.set('state', authState);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);

      console.log('Generated auth URL:', authUrl.toString());
      console.log('Using environment:', squareEnvironment);
      console.log('Using base URL:', baseUrl);

      return new Response(JSON.stringify({
        success: true,
        authUrl: authUrl.toString(),
        state: authState
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'handle_callback') {
      if (!code) {
        throw new Error('Authorization code is required');
      }

      console.log('Handling OAuth callback with code:', code);

      // Exchange authorization code for access token
      const tokenUrl = squareEnvironment === 'production'
        ? 'https://connect.squareup.com/oauth2/token'
        : 'https://connect.squareupsandbox.com/oauth2/token';

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        },
        body: JSON.stringify({
          client_id: squareAppId,
          client_secret: squareAppSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Square token exchange failed:', tokenData);
        throw new Error(tokenData.errors?.[0]?.detail || 'Failed to exchange authorization code');
      }

      console.log('Square OAuth success:', { 
        expires_at: tokenData.expires_at,
        merchant_id: tokenData.merchant_id 
      });

      // Get merchant information
      const merchantResponse = await fetch(
        squareEnvironment === 'production'
          ? 'https://connect.squareup.com/v2/merchants'
          : 'https://connect.squareupsandbox.com/v2/merchants',
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Square-Version': '2023-10-18'
          }
        }
      );

      const merchantData = await merchantResponse.json();
      
      if (!merchantResponse.ok) {
        console.error('Failed to get merchant info:', merchantData);
        throw new Error('Failed to get merchant information');
      }

      const merchant = merchantData.merchant[0];
      const location = merchant.main_location_id;

      return new Response(JSON.stringify({
        success: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_at,
        merchantId: tokenData.merchant_id,
        locationId: location,
        merchantInfo: {
          name: merchant.business_name,
          country: merchant.country,
          currency: merchant.currency
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action specified');

  } catch (error) {
    console.error('Square OAuth error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});