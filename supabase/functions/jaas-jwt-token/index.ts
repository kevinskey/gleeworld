import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

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
    const { roomName, userName, isModerator = true, userEmail, userId } = await req.json();
    
    console.log('Generating JaaS JWT for room:', roomName, 'user:', userName);

    const privateKeyPem = Deno.env.get('JAAS_PRIVATE_KEY');
    const appIdRaw = Deno.env.get('JAAS_APP_ID') || 'vpaas-magic-cookie-f5bedadd63834d7887fe0bfe495bd2f9';
    // Some setups accidentally store "{appId}/{keyId}" in JAAS_APP_ID.
    // JaaS expects appId to be ONLY the vpaas-magic-cookie-* value.
    const appId = appIdRaw.split('/')[0].trim();
    const keyId = Deno.env.get('JAAS_KEY_ID');

    if (!privateKeyPem) {
      throw new Error('JAAS_PRIVATE_KEY not configured');
    }

    if (!keyId) {
      throw new Error('JAAS_KEY_ID not configured');
    }

    // Parse PEM private key
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = privateKeyPem
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");
    
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    // Import the private key for RS256
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      true,
      ["sign"]
    );

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 7200; // 2 hours

    // JaaS JWT payload
    const payload = {
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: roomName || "*",
      exp: exp,
      nbf: now,
      context: {
        user: {
          id: userId || crypto.randomUUID(),
          name: userName || "Glee Member",
          email: userEmail || "",
          moderator: isModerator ? "true" : "false",
          avatar: ""
        },
        features: {
          livestreaming: "true",
          recording: "true",
          transcription: "true",
          "outbound-call": "true"
        }
      }
    };

    // Create JWT with RS256
    const jwt = await create(
      { 
        alg: "RS256", 
        typ: "JWT",
        kid: `${appId}/${keyId}`
      },
      payload,
      privateKey
    );

    console.log('JWT generated successfully');

    return new Response(JSON.stringify({ token: jwt, appId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating JaaS JWT:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
