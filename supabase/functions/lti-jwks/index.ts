// lti-jwks — serves the tool's public RSA key as a JWKS document.
//
// Canvas fetches this when verifying any JWT we sign (client-assertion
// for AGS/NRPS, deep-linking responses, etc.). The platform admin pastes
// this URL into the LTI Developer Key form.
//
// Public key + kid are loaded from env (LTI_PUBLIC_JWK) — generated
// once via openssl + the python conversion script alongside lti_private.pem
// on the droplet. Rotating: generate new pair, append the new JWK to a
// keys array here, keep the old one online until clients re-cache.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const raw = Deno.env.get("LTI_PUBLIC_JWK") ?? "";
  if (!raw) {
    return new Response(JSON.stringify({ error: "no_key_configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  let jwk: Record<string, unknown>;
  try { jwk = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ error: "bad_key_env" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ keys: [jwk] }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      // 1h cache — Canvas honors this. Long enough to avoid hammering us;
      // short enough that a rotation propagates same day.
      "Cache-Control": "public, max-age=3600",
    },
  });
});
