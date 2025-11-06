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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    if (!code) {
      throw new Error('No authorization code received');
    }

    const clientId = Deno.env.get('CANVA_CLIENT_ID');
    const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('Canva credentials not configured');
    }

    const redirectUri = `${url.origin}/functions/v1/canva-oauth-callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    
    // Redirect back to app with success and token info
    const appUrl = state || url.origin;
    const redirectUrl = new URL(appUrl);
    redirectUrl.searchParams.set('canva_auth', 'success');
    redirectUrl.searchParams.set('access_token', tokenData.access_token);
    if (tokenData.refresh_token) {
      redirectUrl.searchParams.set('refresh_token', tokenData.refresh_token);
    }

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl.toString(),
      },
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Redirect back to app with error
    const url = new URL(req.url);
    const appUrl = url.searchParams.get('state') || url.origin;
    const redirectUrl = new URL(appUrl);
    redirectUrl.searchParams.set('canva_auth', 'error');
    redirectUrl.searchParams.set('error', error.message);

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl.toString(),
      },
    });
  }
});
