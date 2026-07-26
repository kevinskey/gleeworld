// tsb-store-drafts
//
// Server-side proxy that fetches the tenant's design drafts from TSB
// using the shared GLEEWORLD_SERVICE_KEY (never exposed to the browser).
// Returns { drafts: [...] } — each draft has status pending/approved/
// rejected + optional review_notes.
//
// The GleeWorld Fundraising card uses this to show "your submitted
// designs" so a tenant admin can see what they've submitted and where
// TSB is with it, without leaving GleeWorld.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveStoreTenant } from "../_shared/tsbTenant.ts";

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

    const body = await req.json().catch(() => ({}));

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { tenant, error: scopeErr } = await resolveStoreTenant<
      { id: string; tsb_store_slug: string | null }
    >(admin, profile, body?.tenant_slug, "id, tsb_store_slug");
    if (scopeErr) return jsonError(scopeErr.status, scopeErr.message);
    if (!tenant?.tsb_store_slug) return jsonOk({ drafts: [] });

    // Fetch drafts + current storefront settings in parallel — the
    // Fundraising card uses both. Keeping them in one fn saves the
    // client a round trip and one fn cold-start.
    const [draftsResp, storeResp] = await Promise.all([
      fetch(
        `${tsbOrigin}/api/gleeworld/stores/${encodeURIComponent(tenant.tsb_store_slug)}/design-drafts`,
        { headers: { "x-gleeworld-service-key": gwServiceKey } },
      ),
      fetch(
        `${tsbOrigin}/api/gleeworld/stores/${encodeURIComponent(tenant.tsb_store_slug)}`,
        { headers: { "x-gleeworld-service-key": gwServiceKey } },
      ),
    ]);
    const draftsBody = await draftsResp.json().catch(() => ({}));
    const storeBody = await storeResp.json().catch(() => ({}));
    if (!draftsResp.ok) return jsonError(502, draftsBody?.error || `TSB drafts ${draftsResp.status}`);
    return jsonOk({
      drafts: draftsBody.drafts ?? [],
      brand: storeResp.ok ? (storeBody.brand_json ?? {}) : {},
      fundraiser: storeResp.ok ? (storeBody.fundraiser_json ?? {}) : {},
    });
  } catch (err) {
    console.error("[tsb-store-drafts] unhandled", err);
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
