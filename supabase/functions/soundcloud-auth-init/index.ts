import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SOUNDCLOUD_CLIENT_ID = Deno.env.get("SOUNDCLOUD_CLIENT_ID")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { redirectUri } = await req.json();
    
    // Build SoundCloud OAuth URL
    const authUrl = new URL('https://secure.soundcloud.com/connect');
    authUrl.searchParams.set('client_id', SOUNDCLOUD_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'non-expiring');
    authUrl.searchParams.set('display', 'popup');

    console.log('Generated SoundCloud auth URL:', authUrl.toString());

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in soundcloud-auth-init:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});