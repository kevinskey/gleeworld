// tsb-store-sso
//
// Mints a short-lived HS256 JWT the client can use to sign into a TSB
// group store's admin dashboard without the email/magic-link dance.
// Signed with the shared GLEEWORLD_SSO_SECRET which TSB verifies at
// POST /api/group-store-admin/sso-exchange.
//
// Flow on the client:
//   1. Click "Manage Store" → call this fn → receive { token }
//   2. Open `${tsb_admin_url}?gwsso=<token>` in a new tab
//   3. TSB's GroupStoreAdminPage sees `?gwsso=`, POSTs to sso-exchange,
//      stores the returned session token, and drops into the dashboard
//
// The token is scoped to a single store (encoded in the payload). Life:
// 2 minutes — long enough for a browser tab open, short enough that a
// leaked URL can't be re-used.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const secret = Deno.env.get("GLEEWORLD_SSO_SECRET") ?? "";
    if (!secret) return jsonError(503, "SSO not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonError(401, "Missing authorization header");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonError(401, "Not signed in");

    const { data: profile } = await supabase
      .from("gw_profiles")
      .select("email, tenant_id, first_name, last_name, is_admin, is_super_admin, role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return jsonError(403, "Profile not found");

    const canAdmin = profile.is_super_admin === true
      || profile.is_admin === true
      || profile.role === "admin"
      || profile.role === "super_admin"
      || profile.role === "super-admin"
      || profile.role === "owner";
    if (!canAdmin) return jsonError(403, "Only tenant admins can access the store");

    // Look up the tenant's linked store slug.
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: tenant } = await admin
      .from("gw_tenants")
      .select("slug, tsb_store_slug")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    if (!tenant?.tsb_store_slug) {
      return jsonError(404, "This tenant does not have a TSB store enabled");
    }

    // Encode HS256 key.
    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );

    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null;
    const jwt = await create(
      { alg: "HS256", typ: "JWT" },
      {
        iss: "gleeworld",
        store_slug: tenant.tsb_store_slug,
        email: profile.email || user.email,
        name,
        iat: getNumericDate(0),
        exp: getNumericDate(60 * 2), // 2 minutes
      },
      key,
    );

    const tsbOrigin = Deno.env.get("TSB_API_BASE") ?? "https://tshirtbrothers.com";
    const enc = encodeURIComponent(jwt);
    return jsonOk({
      token: jwt,
      admin_url: `${tsbOrigin}/stores/${tenant.tsb_store_slug}/admin?gwsso=${enc}`,
      // Whitelabel design studio, pre-branded via ?store=<slug>, plus the
      // same one-click JWT handoff so the tenant admin can submit
      // designs without an email code.
      design_url: `${tsbOrigin}/design?store=${encodeURIComponent(tenant.tsb_store_slug)}&gwsso=${enc}`,
    });
  } catch (err) {
    console.error("[tsb-store-sso] unhandled", err);
    return jsonError(500, err instanceof Error ? err.message : "Unknown error");
  }
});

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
