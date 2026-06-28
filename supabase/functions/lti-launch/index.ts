// lti-launch — Step 2 of the LTI 1.3 OIDC launch.
//
// Canvas POSTs here (application/x-www-form-urlencoded) with the signed
// id_token JWT and our `state` echoed back. We:
//   1. Look up the lti_oidc_state row for `state` (proves the launch
//      pairs with an init we issued)
//   2. Fetch the platform's JWKs and verify the id_token signature (RS256)
//   3. Validate iss, aud, exp, nonce per the LTI 1.3 + OIDC spec
//   4. Extract the LTI user (sub, email, name, roles) + context (course)
//   5. Find or create the matching GleeWorld auth user, record the link
//   6. Mint a Supabase magic-link, 302 the browser to it — the browser
//      lands signed-in on /auth/lti, which routes to /dashboard

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v5.6.3/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// LTI 1.3 message-type + version claims we expect on every launch.
const REQUIRED_MESSAGE_TYPES = new Set([
  "LtiResourceLinkRequest",
  "LtiDeepLinkingRequest", // we don't act on deep link yet but accept the message type
]);

function htmlError(status: number, title: string, detail?: string): Response {
  const safe = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const body = `<!doctype html><html><head><title>${safe(title)}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:80px auto;padding:0 20px;color:#0f172a}h1{font-size:20px}p{color:#64748b;line-height:1.5}</style>
</head><body>
<h1>${safe(title)}</h1>
${detail ? `<p>${safe(detail)}</p>` : ""}
<p>If this persists, your Canvas admin needs to re-check the GleeWorld LTI registration.</p>
</body></html>`;
  return new Response(body, { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return htmlError(405, "Method not allowed", "Canvas should POST to this endpoint with the id_token.");
  }

  // Parse form post
  const form = await req.text();
  const params = new URLSearchParams(form);
  const state = params.get("state");
  const idToken = params.get("id_token");
  if (!state || !idToken) {
    return htmlError(400, "Missing state or id_token");
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Look up + consume the state row (delete after read so the same
  // launch can't be replayed).
  const { data: stateRow, error: stateErr } = await admin
    .from("lti_oidc_state")
    .select("nonce, platform_id, target_link_uri, created_at")
    .eq("state", state)
    .maybeSingle();
  if (stateErr || !stateRow) {
    return htmlError(400, "Unknown LTI state", "The launch state has expired or didn't originate from a valid init.");
  }
  // 10-minute expiry mirrors the cleanup helper in the migration.
  const ageMs = Date.now() - new Date(stateRow.created_at).getTime();
  if (ageMs > 10 * 60 * 1000) {
    await admin.from("lti_oidc_state").delete().eq("state", state);
    return htmlError(400, "Launch expired", "Click the GleeWorld link in Canvas again.");
  }
  // Pop the row — single-use semantics.
  await admin.from("lti_oidc_state").delete().eq("state", state);

  // Load the platform record.
  const { data: platform, error: pErr } = await admin
    .from("lti_platforms")
    .select("id, issuer, client_id, deployment_id, jwks_url, tenant_id")
    .eq("id", stateRow.platform_id)
    .single();
  if (pErr || !platform) {
    return htmlError(500, "Platform record missing", pErr?.message);
  }

  // Verify the JWT signature against Canvas's JWKs, and validate claims.
  let payload: jose.JWTPayload;
  try {
    const jwks = jose.createRemoteJWKSet(new URL(platform.jwks_url));
    const verified = await jose.jwtVerify(idToken, jwks, {
      issuer: platform.issuer,
      audience: platform.client_id,
    });
    payload = verified.payload;
  } catch (e) {
    return htmlError(401, "Invalid LTI token", e instanceof Error ? e.message : String(e));
  }

  // LTI 1.3 message-type guard.
  const messageType = payload["https://purl.imsglobal.org/spec/lti/claim/message_type"] as string | undefined;
  if (!messageType || !REQUIRED_MESSAGE_TYPES.has(messageType)) {
    return htmlError(400, "Unsupported LTI message type", `Got: ${messageType ?? "(none)"}`);
  }
  if (payload["https://purl.imsglobal.org/spec/lti/claim/version"] !== "1.3.0") {
    return htmlError(400, "Unsupported LTI version");
  }
  // Deployment must match the registered one.
  const deploymentClaim = payload["https://purl.imsglobal.org/spec/lti/claim/deployment_id"] as string | undefined;
  if (deploymentClaim !== platform.deployment_id) {
    return htmlError(401, "Deployment ID mismatch", "This Canvas deployment is not registered to launch GleeWorld.");
  }
  // Nonce must match the one we minted in lti-oidc-init.
  if (payload.nonce !== stateRow.nonce) {
    return htmlError(401, "Nonce mismatch", "Possible replay attempt; launch rejected.");
  }

  // Extract the LTI user.
  const ltiSub = payload.sub as string | undefined;
  const email = (payload.email as string | undefined)?.toLowerCase().trim();
  const name = (payload.name as string | undefined) ?? null;
  if (!ltiSub) return htmlError(400, "Missing sub claim");
  if (!email) return htmlError(400, "Missing email claim", "Ask your Canvas admin to enable the 'email' privacy setting on the GleeWorld tool.");

  // Find existing GleeWorld auth user by email (case-insensitive match
  // happens through Supabase admin.listUsers + filter).
  let userId: string | null = null;
  const { data: existing, error: lookupErr } = await admin.auth.admin.listUsers({
    page: 1, perPage: 1,
    // listUsers doesn't have a direct email filter in supabase-js@2.x;
    // we look up via the public profile table instead which is faster.
  });
  if (lookupErr) {
    // Non-fatal — fall through to profile lookup.
    console.warn("[lti-launch] listUsers warn:", lookupErr.message);
  }
  void existing; // unused — kept for shape compatibility with future per-page paging

  const { data: profile } = await admin
    .from("gw_profiles")
    .select("user_id")
    .ilike("email", email)
    .maybeSingle();
  if (profile?.user_id) {
    userId = profile.user_id;
  } else {
    // No existing user — create one inside the registered tenant.
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        created_via: "lti",
        lti_issuer: platform.issuer,
      },
    });
    if (cErr || !created?.user) {
      return htmlError(500, "Could not create GleeWorld user", cErr?.message);
    }
    userId = created.user.id;
    // Attach a default profile in the platform's tenant. Other apps in
    // GleeWorld depend on every auth user having a gw_profiles row.
    await admin.from("gw_profiles").insert({
      user_id: userId,
      email,
      full_name: name,
      tenant_id: platform.tenant_id,
      role: "student",
    });
  }

  // Phase 2 — capture AGS + NRPS endpoints + the course context so
  // background jobs (grade push, roster sync) can call Canvas without
  // needing a fresh launch.
  const context = payload["https://purl.imsglobal.org/spec/lti/claim/context"] as
    | { id?: string; title?: string } | undefined;
  const resourceLink = payload["https://purl.imsglobal.org/spec/lti/claim/resource_link"] as
    | { id?: string } | undefined;
  const agsClaim = payload["https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"] as
    | { lineitems?: string; lineitem?: string; scope?: string[] } | undefined;
  const nrpsClaim = payload["https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice"] as
    | { context_memberships_url?: string } | undefined;

  let contextLinkId: string | null = null;
  if (context?.id) {
    const { data: ctxRow } = await admin
      .from("lti_context_links")
      .upsert({
        platform_id: platform.id,
        context_id: context.id,
        context_title: context.title ?? null,
        resource_link_id: resourceLink?.id ?? null,
        ags_lineitems_url: agsClaim?.lineitems ?? null,
        ags_lineitem_url: agsClaim?.lineitem ?? null,
        ags_scopes: agsClaim?.scope ?? null,
        nrps_context_memberships_url: nrpsClaim?.context_memberships_url ?? null,
        tenant_id: platform.tenant_id,
        last_launch_at: new Date().toISOString(),
      }, { onConflict: "platform_id,context_id" })
      .select("id")
      .single();
    contextLinkId = ctxRow?.id ?? null;
  }

  // Upsert the lti_user_links row so future launches are O(1). Include
  // convenience copies of the AGS/NRPS endpoints so per-user score
  // pushes don't need to join through lti_context_links.
  const { data: userLink } = await admin
    .from("lti_user_links")
    .upsert({
      platform_id: platform.id,
      lti_sub: ltiSub,
      user_id: userId!,
      email_at_link: email,
      last_launch_at: new Date().toISOString(),
      last_context_id: context?.id ?? null,
      last_lineitem_url: agsClaim?.lineitem ?? null,
      last_nrps_url: nrpsClaim?.context_memberships_url ?? null,
    }, { onConflict: "platform_id,lti_sub" })
    .select("id")
    .single();

  // Record the (user, context) tuple in the multi-course ledger so a
  // student enrolled in two Canvas courses through the same platform
  // gets grades pushed to BOTH (last_context_id only tracks the most
  // recent and would otherwise lose the older course).
  if (userLink?.id && contextLinkId) {
    await admin
      .from("lti_user_contexts")
      .upsert({
        user_link_id: userLink.id,
        context_link_id: contextLinkId,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "user_link_id,context_link_id" });
  }

  // Phase 3 — DeepLinkingRequest fork. When Canvas launches us to let an
  // instructor pick content, we stash the deep-link callback bundle and
  // route the picker to /lti/deep-link?handle=... instead of /dashboard.
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://gleeworld.org";
  let postLoginUrl = stateRow.target_link_uri ?? `${siteUrl}/auth/lti`;
  if (messageType === "LtiDeepLinkingRequest") {
    const dlSettings = payload["https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings"] as
      | {
          deep_link_return_url?: string;
          data?: string;
          accept_types?: string[];
          accept_presentation_document_targets?: string[];
          accept_multiple?: boolean;
        } | undefined;
    if (!dlSettings?.deep_link_return_url) {
      return htmlError(400, "Missing deep_link_return_url");
    }
    const handle = crypto.randomUUID().replace(/-/g, "");
    await admin.from("lti_deep_link_state").insert({
      handle,
      platform_id: platform.id,
      user_id: userId!,
      deep_link_return_url: dlSettings.deep_link_return_url,
      data: dlSettings.data ?? null,
      accept_types: dlSettings.accept_types ?? null,
      accept_presentation_targets: dlSettings.accept_presentation_document_targets ?? null,
      accept_multiple: dlSettings.accept_multiple ?? false,
    });
    postLoginUrl = `${siteUrl}/lti/deep-link?handle=${handle}`;
  }

  // Mint a one-time magic link. Supabase's action_link is a URL whose
  // visit sets the session cookie and redirects to redirectTo. We send
  // the browser there in a 302; the user lands signed-in on /auth/lti
  // (or the deep-link picker, in DeepLinkingRequest mode).
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: postLoginUrl.startsWith("http") ? postLoginUrl : `${siteUrl}/auth/lti` },
  });
  if (linkErr || !link?.properties?.action_link) {
    return htmlError(500, "Could not issue session", linkErr?.message);
  }

  return Response.redirect(link.properties.action_link, 302);
});
