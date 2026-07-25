// tsb-store-update
//
// Proxies tenant storefront edits (hero image, tagline, fundraiser
// headline/description/goal) to TSB's PATCH /api/gleeworld/stores/:slug
// using the shared GLEEWORLD_SERVICE_KEY. TSB whitelists which fields
// this endpoint can touch; the edge fn just adds authn on the GleeWorld
// side (tenant admin only) and forwards.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const tsbOrigin = Deno.env.get("TSB_API_BASE") ?? "https://tshirtbrothers.com";
    const gwServiceKey = Deno.env.get("GLEEWORLD_SERVICE_KEY") ?? "";
    if (!gwServiceKey) return jsonError(503, "Integration not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonError(401, "Missing authorization header");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonError(401, "Not signed in");

    const { data: profile } = await supabase
      .from("gw_profiles")
      .select("tenant_id, is_admin, is_super_admin, role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return jsonError(403, "Profile not found");

    const canManage = profile.is_super_admin === true
      || profile.is_admin === true
      || profile.role === "admin"
      || profile.role === "super_admin"
      || profile.role === "super-admin"
      || profile.role === "owner";
    if (!canManage) return jsonError(403, "Only tenant admins can edit the storefront");

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: tenant } = await admin
      .from("gw_tenants")
      .select("tsb_store_slug")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    if (!tenant?.tsb_store_slug) return jsonError(404, "Tenant has no linked store");

    const body = await req.json().catch(() => ({}));
    const resp = await fetch(
      `${tsbOrigin}/api/gleeworld/stores/${encodeURIComponent(tenant.tsb_store_slug)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-gleeworld-service-key": gwServiceKey,
        },
        body: JSON.stringify(body),
      },
    );
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) return jsonError(502, j?.error || `TSB responded ${resp.status}`);
    return jsonOk(j);
  } catch (err) {
    console.error("[tsb-store-update] unhandled", err);
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
