// canvas-list-courses — read-only proof that the headless Canvas
// integration works. Returns the calling user's Canvas courses,
// auto-provisioning a Canvas user on first call if needed.
//
// Response shape is shaped for the GleeWorld Academy UI to render.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCanvasClientForTenant } from "../_shared/canvas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return err(401, "unauthorized");

  const payload = decodeJwtPayload(jwt);
  // deno-lint-ignore no-explicit-any
  const tenantId = (payload as any)?.tenant_id ?? (payload as any)?.app_metadata?.tenant_id;
  // deno-lint-ignore no-explicit-any
  const userId = (payload as any)?.sub;
  if (!tenantId || !userId) return err(400, "no_tenant_or_user_in_jwt");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Resolve Canvas binding for the tenant.
  const resolved = await getCanvasClientForTenant(admin, tenantId);
  if (!resolved) return err(409, "canvas_not_bound", "Tenant has no Canvas binding. Call canvas-bootstrap-tenant first.");
  const { client, accountId } = resolved;

  // Resolve / provision the Canvas user for the caller.
  const { data: profile } = await admin
    .from("gw_profiles")
    .select("canvas_user_id, email, full_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.email) return err(404, "profile_not_found");

  let canvasUserId = profile.canvas_user_id;
  if (!canvasUserId) {
    try {
      const u = await client.ensureUser({ email: profile.email, name: profile.full_name ?? undefined, accountId });
      canvasUserId = u.id;
      await admin.from("gw_profiles").update({ canvas_user_id: canvasUserId }).eq("user_id", userId);
    } catch (e) {
      return err(502, "canvas_user_provision_failed", e instanceof Error ? e.message : String(e));
    }
  }

  // List the user's courses.
  let courses: Array<{ id: number; name: string; course_code?: string }>;
  try {
    courses = await client.listUserCourses(canvasUserId!);
  } catch (e) {
    return err(502, "canvas_list_courses_failed", e instanceof Error ? e.message : String(e));
  }

  return new Response(JSON.stringify({
    ok: true,
    canvas_user_id: canvasUserId,
    courses: courses.map((c) => ({ id: c.id, name: c.name, code: c.course_code ?? null })),
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
