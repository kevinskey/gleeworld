// provision-tsb-store
//
// GleeWorld → TSB handshake. A tenant admin clicks "Enable Fundraising
// Store" in Workspace Settings; the client calls this edge function.
// We:
//   1. Authenticate the caller (must be an admin/super-admin of some tenant).
//   2. Look up the tenant's slug + branding row.
//   3. Call TSB /api/gleeworld/provision-store with the shared service key.
//      TSB is idempotent — retry-safe.
//   4. Write tsb_store_slug + tsb_store_subdomain back onto gw_tenants.
//   5. Return the storefront + admin URLs to the caller.
//
// Env required on the edge-function side:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   TSB_API_ORIGIN          (default https://tshirtbrothers.com)
//   GLEEWORLD_SERVICE_KEY   (matches TSB server .env)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveStoreTenant } from "../_shared/tsbTenant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProvisionResponse {
  id: number;
  slug: string;
  subdomain: string | null;
  name: string;
  storefront_url: string;
  admin_url: string;
  created: boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const tsbOrigin = Deno.env.get("TSB_API_BASE") ?? "https://tshirtbrothers.com";
    const gwServiceKey = Deno.env.get("GLEEWORLD_SERVICE_KEY") ?? "";

    if (!gwServiceKey) {
      return jsonError(503, "Fundraising store integration not configured (missing GLEEWORLD_SERVICE_KEY)");
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonError(401, "Missing authorization header");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonError(401, "Not signed in");

    // Look up the caller's profile + which tenant they administer. This
    // uses the user's JWT so RLS enforces they can only act on their own
    // profile's tenant.
    const { data: profile } = await supabase
      .from("gw_profiles")
      .select("user_id, email, tenant_id, is_admin, is_super_admin, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return jsonError(403, "Profile not found");

    const body = await req.json().catch(() => ({}));

    // Provision for the tenant whose SITE the caller is on, not whichever
    // tenant their own profile belongs to — resolveStoreTenant also does the
    // admin check (home tenant: any admin; another tenant: super-admin only).
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { tenant, error: scopeErr } = await resolveStoreTenant<{
      id: string;
      slug: string;
      name: string | null;
      tsb_store_slug: string | null;
      tsb_store_subdomain: string | null;
    }>(admin, profile, body?.tenant_slug, "id, slug, name, tsb_store_slug, tsb_store_subdomain");
    if (scopeErr) return jsonError(scopeErr.status, scopeErr.message);
    if (!tenant) return jsonError(404, "Tenant not found");

    const { data: branding } = await admin
      .from("gw_branding_settings")
      .select("org_name, short_name, logo_url, primary_color, accent_color")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    // Build the TSB payload. Slug = tenant slug (enforced by convention).
    // Fundraiser defaults to on at 15% for a v1 — the tenant can dial it
    // in via TSB admin. If we already know a subdomain, reuse it so a
    // re-provisioned tenant doesn't churn its URL.
    const tsbBody = {
      slug: tenant.slug,
      name: branding?.org_name || tenant.name || tenant.slug,
      owner_email: profile.email || user.email || "kevin@tshirtbrothers.com",
      subdomain: tenant.tsb_store_subdomain ?? undefined,
      brand_json: {
        logo_url: branding?.logo_url ?? null,
        primary_color: branding?.primary_color ?? null,
        accent_color: branding?.accent_color ?? null,
        back_url: `https://${tenant.slug}.gleeworld.org/dashboard/fundraising`,
      },
      is_fundraiser: true,
      fundraiser_json: {
        contribution_type: "percent",
        contribution_value: 15,
      },
      initial_admin_email: profile.email || user.email,
      initial_admin_name: null,
    };

    const tsbResp = await fetch(`${tsbOrigin}/api/gleeworld/provision-store`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gleeworld-service-key": gwServiceKey,
      },
      body: JSON.stringify(tsbBody),
    });

    const tsbJson: ProvisionResponse | { error: string } = await tsbResp.json();
    if (!tsbResp.ok) {
      const msg = "error" in tsbJson ? tsbJson.error : `TSB responded ${tsbResp.status}`;
      // Pass a client-fixable status through unchanged. A 409 ("slug already
      // used") is the caller's problem to resolve, not a bad gateway, and
      // reporting it as 502 makes it look like TSB is down when it is fine.
      const status = tsbResp.status >= 400 && tsbResp.status < 500 ? tsbResp.status : 502;
      return jsonError(status, `Provisioning failed: ${msg}`);
    }
    const store = tsbJson as ProvisionResponse;

    // Persist the link back to gw_tenants. This MUST be checked: the store
    // already exists at TSB by this point, so a silent failure here orphans
    // it — created upstream, invisible to GleeWorld, and the UI keeps showing
    // "Enable" forever while every retry hits a slug conflict.
    const { error: linkErr } = await admin
      .from("gw_tenants")
      .update({
        tsb_store_slug: store.slug,
        tsb_store_subdomain: store.subdomain,
      })
      .eq("id", tenant.id);
    if (linkErr) {
      console.error("[provision-tsb-store] link write-back failed", {
        tenant_id: tenant.id, store_slug: store.slug, error: linkErr.message,
      });
      return jsonError(
        500,
        `Store "${store.slug}" was created at TSB but could not be linked to this tenant: ${linkErr.message}. Re-running will report a slug conflict until the link is repaired.`,
      );
    }

    return jsonOk({
      slug: store.slug,
      subdomain: store.subdomain,
      name: store.name,
      storefront_url: store.storefront_url,
      admin_url: store.admin_url,
      created: store.created,
    });
  } catch (err) {
    console.error("[provision-tsb-store] unhandled", err);
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
