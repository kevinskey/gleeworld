// gw-demo-toggle-addon — flip an add-on on/off without involving Stripe.
//
// HARD-GATED to the demo tenant only. Lets prospective customers click
// around the platform and see what each add-on actually does without
// having to pay (or contaminate real tenants' subscriptions).
//
// Body: { module_id: string, active: boolean }
// Returns: { ok, module_id, active }
//
// Refuses with 403 if the caller's tenant isn't the demo tenant.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyClaims } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Pinned demo tenant id (from reference_gleeworld_ios.md memory). If the
// demo tenant ever changes, update this value or refactor to look up by
// slug='demo' from gw_tenants.
const DEMO_TENANT_ID = "ae2fbec2-7562-45f9-9028-c4df93b99cef";

function err(status: number, code: string, detail?: string) {
  return new Response(JSON.stringify({ error: code, detail }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return err(405, "method_not_allowed");

  const payload = await verifyClaims(req);
  if (!payload) return err(401, "unauthorized");
  // deno-lint-ignore no-explicit-any
  const tenantId = (payload as any)?.tenant_id || (payload as any)?.app_metadata?.tenant_id;
  if (!tenantId) return err(400, "no_tenant_in_jwt");
  if (tenantId !== DEMO_TENANT_ID) {
    return err(403, "demo_only", "This sandbox toggle is only available on the demo tenant.");
  }

  // Read-only demo prospects must never flip modules — their sessions are
  // anonymously mintable via /try, and this function writes with the
  // service role (bypassing the demo_viewer RLS block).
  if ((payload as any)?.demo_viewer === true) {
    return err(403, "demo_viewer_readonly", "The demo preview is read-only.");
  }

  let body: { module_id?: string; active?: boolean };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.module_id || typeof body.active !== "boolean") {
    return err(400, "missing_fields");
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Sanity-check the module exists and is in the catalog.
  const { data: mod, error: modErr } = await admin
    .from("gw_billing_modules")
    .select("id, name")
    .eq("id", body.module_id)
    .maybeSingle();
  if (modErr || !mod) return err(404, "module_not_found", modErr?.message);

  if (body.active) {
    const { error } = await admin
      .from("gw_tenant_subscriptions")
      .upsert({
        tenant_id: DEMO_TENANT_ID,
        module_id: body.module_id,
        status: "trial",                       // marks it as sandbox-not-paid
        enabled_at: new Date().toISOString(),
        cancelled_at: null,
        metadata: { sandbox: true },
      }, { onConflict: "tenant_id,module_id" });
    if (error) return err(500, "activate_failed", error.message);
  } else {
    const { error } = await admin
      .from("gw_tenant_subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("tenant_id", DEMO_TENANT_ID)
      .eq("module_id", body.module_id);
    if (error) return err(500, "deactivate_failed", error.message);
  }

  return new Response(JSON.stringify({ ok: true, module_id: body.module_id, active: body.active }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
