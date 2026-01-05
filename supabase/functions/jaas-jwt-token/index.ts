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
    // JAAS_APP_ID should be the full vpaas app id, typically: "vpaas-magic-cookie-<tenant>"
    const appId = Deno.env.get('JAAS_APP_ID') || 'vpaas-magic-cookie-f5bedadd63834d7887fe0bfe495bd2f9';
    // JAAS_KEY_ID should be your key id in JaaS, typically: "<tenant>/<apiKeyId>" (NOT a public key, not a vpaas id)
    const keyId = Deno.env.get('JAAS_KEY_ID');

    if (!privateKeyPem) {
      throw new Error('JAAS_PRIVATE_KEY not configured');
    }

    if (!keyId) {
      throw new Error('JAAS_KEY_ID not configured');
    }

    // Basic config validation to avoid generating tokens that JaaS will reject
    console.log('DEBUG: JAAS_APP_ID value:', JSON.stringify(appId), 'JAAS_KEY_ID value:', JSON.stringify(keyId));
    
    if (!appId.startsWith('vpaas-magic-cookie-') || appId.includes(':') || appId.includes(' ')) {
      throw new Error(`JAAS_APP_ID invalid. Got: "${appId}". Expected like: vpaas-magic-cookie-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);
    }

    // Relaxed validation - just check it has a slash (tenant/keyId format)
    if (!keyId.includes('/') || keyId.includes('BEGIN')) {
      throw new Error('JAAS_KEY_ID invalid. Expected like: <tenant>/<apiKeyId> (from JaaS Console > API Keys)');
    }

    console.log('Using appId:', appId, 'keyId:', keyId);

    // Parse PEM private key - be tolerant of common env var formatting issues
    // (wrapped quotes, escaped newlines, extra whitespace, etc.)
    const pemRaw = (privateKeyPem || "").trim().replace(/^['"]|['"]$/g, "");

    // Extract the base64 body from a PEM block if headers are present
    const pemMatch = pemRaw.match(
      /-----BEGIN (?:RSA )?PRIVATE KEY-----([\s\S]*?)-----END (?:RSA )?PRIVATE KEY-----/,
    );

    // Normalize escaped newlines ("\\n") to real newlines before stripping
    const maybeBody = (pemMatch ? pemMatch[1] : pemRaw)
      .replace(/\\r/g, "\r")
      .replace(/\\n/g, "\n");

    // Keep only valid base64 characters
    let base64Body = maybeBody.replace(/[^A-Za-z0-9+/=]/g, "");

    console.log('PEM base64 length after cleanup:', base64Body.length, 'mod4:', base64Body.length % 4);

    if (!base64Body || base64Body.length < 256) {
      throw new Error(
        'JAAS_PRIVATE_KEY appears incomplete. Paste the full PEM including BEGIN/END lines.',
      );
    }

    // Some secret managers strip padding; add it back if needed
    const pad = base64Body.length % 4;
    if (pad !== 0) {
      base64Body = base64Body + "=".repeat(4 - pad);
      console.log('Added base64 padding. New length:', base64Body.length);
    }

    let binaryDer: Uint8Array;
    try {
      binaryDer = Uint8Array.from(atob(base64Body), (c) => c.charCodeAt(0));
    } catch (_e) {
      // Don't log the key; just surface a helpful error.
      throw new Error('Failed to decode base64. Ensure the private key PEM is complete and properly formatted.');
    }
    
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
      iat: now,
      context: {
        user: {
          id: userId || crypto.randomUUID(),
          name: userName || "Glee Member",
          email: userEmail || "",
          moderator: isModerator, // boolean, not string
          avatar: ""
        },
        features: {
          livestreaming: true,
          recording: true,
          transcription: true,
          "outbound-call": true,
          "sip-outbound-call": true
        },
        room: {
          regex: false
        }
      },
      // Add moderator claim at top level for lobby bypass
      moderator: isModerator
    };

    // Create JWT with RS256
    // kid format for JaaS should be just the keyId (which is already tenant/apiKeyId format)
    const jwt = await create(
      { 
        alg: "RS256", 
        typ: "JWT",
        kid: keyId
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
