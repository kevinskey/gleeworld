// lti-deep-link-response — sign the LtiDeepLinkingResponse JWT and
// return HTML that auto-POSTs it back to Canvas.
//
// Called by the GleeWorld picker UI after the instructor selects what
// to embed. Body:
//   {
//     "handle": "<uuid from /lti/deep-link?handle=…>",
//     "items":  [
//       {
//         "title": "GleeWorld — Spring Concert Repertoire",
//         "url":   "https://gleeworld.org/...some deep link..."
//       },
//       ...
//     ]
//   }
//
// We sign with the tool's RSA private key (same one the JWKS endpoint
// publishes). Canvas verifies, then creates the assignment / module
// item with our content.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v5.6.3/index.ts";

const PRIVATE_KEY_PEM = Deno.env.get("LTI_PRIVATE_KEY") ?? "";
const PUBLIC_JWK_RAW = Deno.env.get("LTI_PUBLIC_JWK") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ItemIn {
  title: string;
  url: string;
  text?: string;
}

function err(status: number, code: string, detail?: string) {
  return new Response(JSON.stringify({ error: code, detail }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

let cachedKey: CryptoKey | null = null;
let cachedKid: string | null = null;
async function getKey() {
  if (cachedKey && cachedKid) return { key: cachedKey, kid: cachedKid };
  const pem = PRIVATE_KEY_PEM.replace(/\\n/g, "\n");
  cachedKey = await jose.importPKCS8(pem, "RS256");
  cachedKid = JSON.parse(PUBLIC_JWK_RAW).kid;
  return { key: cachedKey, kid: cachedKid! };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return err(405, "method_not_allowed");

  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return err(401, "unauthorized");

  let body: { handle?: string; items?: ItemIn[] };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.handle || !Array.isArray(body.items) || body.items.length === 0) {
    return err(400, "missing_handle_or_items");
  }

  // Caller-scoped client so the RLS policy enforces "your own handle only".
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const { data: state, error: stateErr } = await supabase
    .from("lti_deep_link_state")
    .select("platform_id, deep_link_return_url, data, accept_multiple, created_at")
    .eq("handle", body.handle)
    .maybeSingle();
  if (stateErr || !state) return err(404, "handle_not_found", stateErr?.message);

  const ageMs = Date.now() - new Date(state.created_at).getTime();
  if (ageMs > 30 * 60 * 1000) return err(410, "handle_expired");

  if (!state.accept_multiple && body.items.length > 1) {
    return err(400, "single_item_only", "This Canvas placement accepts a single resource only.");
  }

  // Service-role client to load the platform's iss/client_id (RLS would block this otherwise).
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: platform, error: pErr } = await admin
    .from("lti_platforms")
    .select("issuer, client_id, deployment_id")
    .eq("id", state.platform_id)
    .single();
  if (pErr || !platform) return err(500, "platform_lookup_failed", pErr?.message);

  // Build the LtiResourceLink content items per spec.
  const contentItems = body.items.map((i) => ({
    type: "ltiResourceLink",
    title: i.title,
    url: i.url,
    ...(i.text ? { text: i.text } : {}),
  }));

  // Sign the response JWT. Issuer = our client_id; audience = Canvas's iss.
  const { key, kid } = await getKey();
  const now = Math.floor(Date.now() / 1000);
  const jwt2 = await new jose.SignJWT({
    "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": platform.deployment_id,
    "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": contentItems,
    ...(state.data ? { "https://purl.imsglobal.org/spec/lti-dl/claim/data": state.data } : {}),
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid })
    .setIssuer(platform.client_id)
    .setAudience(platform.issuer)
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .setJti(crypto.randomUUID())
    .sign(key);

  // Single-use handle.
  await admin.from("lti_deep_link_state").delete().eq("handle", body.handle);

  // Return HTML that auto-POSTs the JWT back to Canvas.
  const html = `<!doctype html>
<html><body onload="document.forms[0].submit()">
<form action="${escape(state.deep_link_return_url)}" method="POST">
  <input type="hidden" name="JWT" value="${escape(jwt2)}" />
  <noscript><button type="submit">Continue</button></noscript>
</form>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
