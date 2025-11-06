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
    const { returnUrl, scopes } = await req.json();
    
    const clientId = Deno.env.get('CANVA_CLIENT_ID');
    
    if (!clientId) {
      console.error('CANVA_CLIENT_ID missing');
      throw new Error('CANVA_CLIENT_ID not configured');
    }
    const url = new URL(req.url);

    // Always use HTTPS for Supabase Edge redirect URI (avoid http during local edge runtime)
    const redirectUri = `https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/canva-oauth-callback`;
  
    // Build Canva authorization URL
    const authUrl = new URL('https://www.canva.com/api/oauth/authorize');
    const scopeStr = (scopes && Array.isArray(scopes) && scopes.length)
      ? scopes.join(' ')
      : 'app:read app:write design:content:read design:content:write design:meta:read asset:read asset:write';

    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopeStr);
    authUrl.searchParams.set('state', returnUrl || `${url.origin}/dashboard`);

    console.log('[canva-oauth-init] redirectUri=', redirectUri);
    console.log('[canva-oauth-init] state=', returnUrl || `${url.origin}/dashboard`);
    console.log('[canva-oauth-init] scope=', scopeStr);

    return new Response(
      JSON.stringify({ 
        success: true, 
        authUrl: authUrl.toString() 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
