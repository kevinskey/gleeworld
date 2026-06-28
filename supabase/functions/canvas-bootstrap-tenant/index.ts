// canvas-bootstrap-tenant — provision a Canvas sub-account for the
// caller's tenant. Idempotent: if a binding already exists we return it.
//
// Called by the tenant admin during the "Enable Canvas-backed Academy"
// onboarding step. Also runs internally by superadmin during automated
// provisioning.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CanvasClient } from "../_shared/canvas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const part = jwt.split(".")[1];
    const padded = part + "===".slice((part.length + 3) % 4);
    return JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
}

function err(status: number, code: string, detail?: string) {
  return new Response(JSON.stringify({ error: code, detail }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return err(405, "method_not_allowed");

  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return err(401, "unauthorized");

  const payload = decodeJwtPayload(jwt);
  // deno-lint-ignore no-explicit-any
  const tenantId = (payload as any)?.tenant_id ?? (payload as any)?.app_metadata?.tenant_id;
  if (!tenantId) return err(400, "no_tenant_in_jwt");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Already bound?
  const { data: existing } = await admin
    .from("gw_tenant_canvas_accounts")
    .select("id, canvas_account_id, canvas_instance_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({
      ok: true, already_bound: true, canvas_account_id: existing.canvas_account_id,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Need: a Canvas instance to bind to (Phase 1: use the only active one).
  const { data: inst } = await admin
    .from("gw_canvas_instances")
    .select("id, base_url, admin_token")
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!inst) return err(503, "no_canvas_instance", "Register a Canvas server in gw_canvas_instances first.");

  // Get the tenant's display name to use as sub-account name.
  const { data: tenant } = await admin
    .from("gw_tenants")
    .select("name, slug")
    .eq("id", tenantId)
    .maybeSingle();
  const subaccountName = tenant?.name ?? tenant?.slug ?? `Tenant ${tenantId.slice(0, 8)}`;

  const client = new CanvasClient(inst);
  let canvasAccountId: number;
  try {
    const sub = await client.ensureSubaccount(subaccountName);
    canvasAccountId = sub.id;
  } catch (e) {
    return err(502, "canvas_subaccount_failed", e instanceof Error ? e.message : String(e));
  }

  const { data: binding, error: bindErr } = await admin
    .from("gw_tenant_canvas_accounts")
    .insert({
      tenant_id: tenantId,
      canvas_instance_id: inst.id,
      canvas_account_id: canvasAccountId,
    })
    .select("id")
    .single();
  if (bindErr) return err(500, "binding_insert_failed", bindErr.message);

  return new Response(JSON.stringify({
    ok: true,
    already_bound: false,
    canvas_account_id: canvasAccountId,
    binding_id: binding.id,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
