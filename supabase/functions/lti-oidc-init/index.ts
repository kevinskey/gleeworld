// lti-oidc-init — Step 1 of the LTI 1.3 OIDC launch.
//
// Canvas calls this endpoint (GET or POST) when a user clicks the
// GleeWorld tool inside Canvas. Per the LTI 1.3 spec we must:
//   1. Identify the platform from `iss` (+ `client_id` if present)
//   2. Generate a fresh `state` and `nonce`
//   3. Persist them so the lti-launch endpoint can correlate the
//      eventual id_token POST back to this init step
//   4. Redirect (302) to the platform's `auth_login_url` with the
//      required OIDC parameters
//
// We do NOT use cookies for state/nonce because Canvas hosts the tool
// in cross-site iframes and SameSite=None cookies aren't reliable across
// all browsers + privacy settings. A short-lived DB row keyed by `state`
// is the bulletproof path.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Canvas POSTs the OIDC init as application/x-www-form-urlencoded
// (the LTI 1.3 spec allows either GET querystring or POST body).
async function readParams(req: Request): Promise<URLSearchParams> {
  if (req.method === "GET") {
    return new URL(req.url).searchParams;
  }
  const ct = req.headers.get("Content-Type") ?? "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const body = await req.text();
    return new URLSearchParams(body);
  }
  // Fallback: try JSON body, otherwise empty.
  try {
    const json = await req.json();
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(json)) sp.set(k, String(v));
    return sp;
  } catch {
    return new URLSearchParams();
  }
}

function randomUrlSafe(byteLen: number): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const params = await readParams(req);
  const issuer = params.get("iss");
  const loginHint = params.get("login_hint");
  const targetLinkUri = params.get("target_link_uri");
  const ltiMessageHint = params.get("lti_message_hint") ?? undefined;
  const clientIdHint = params.get("client_id") ?? undefined;
  const deploymentIdHint = params.get("lti_deployment_id") ?? undefined;

  if (!issuer || !loginHint) {
    return new Response(JSON.stringify({ error: "missing_iss_or_login_hint" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Resolve the platform row. A single Canvas instance may have multiple
  // (client_id, deployment_id) registrations; narrow when Canvas hints.
  let query = admin
    .from("lti_platforms")
    .select("id, client_id, deployment_id, auth_login_url")
    .eq("issuer", issuer)
    .eq("is_active", true);
  if (clientIdHint) query = query.eq("client_id", clientIdHint);
  if (deploymentIdHint) query = query.eq("deployment_id", deploymentIdHint);
  const { data: platforms, error: pErr } = await query.limit(2);
  if (pErr) {
    return new Response(JSON.stringify({ error: "platform_lookup_failed", detail: pErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!platforms || platforms.length === 0) {
    return new Response(JSON.stringify({
      error: "platform_not_registered",
      hint: `Register issuer ${issuer} in lti_platforms before launch.`,
    }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (platforms.length > 1) {
    return new Response(JSON.stringify({
      error: "ambiguous_platform",
      hint: "Multiple lti_platforms rows match this issuer. Pass client_id and lti_deployment_id from Canvas to disambiguate.",
    }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const platform = platforms[0];

  // Mint state + nonce, persist for the launch step.
  const state = randomUrlSafe(32);
  const nonce = randomUrlSafe(32);
  const { error: insErr } = await admin
    .from("lti_oidc_state")
    .insert({
      state,
      nonce,
      platform_id: platform.id,
      target_link_uri: targetLinkUri,
    });
  if (insErr) {
    return new Response(JSON.stringify({ error: "state_persist_failed", detail: insErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Redirect URI = our lti-launch endpoint. Canvas posts the id_token
  // back here as application/x-www-form-urlencoded.
  const publicHost = Deno.env.get("PUBLIC_SUPABASE_URL")
    ?? Deno.env.get("SITE_URL")
    ?? "https://supabase.gleeworld.org";
  const redirectUri = `${publicHost.replace(/\/+$/, "")}/functions/v1/lti-launch`;

  const authUrl = new URL(platform.auth_login_url);
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("response_type", "id_token");
  authUrl.searchParams.set("response_mode", "form_post");
  authUrl.searchParams.set("prompt", "none");
  authUrl.searchParams.set("client_id", platform.client_id);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("login_hint", loginHint);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  if (ltiMessageHint) authUrl.searchParams.set("lti_message_hint", ltiMessageHint);

  return Response.redirect(authUrl.toString(), 302);
});
