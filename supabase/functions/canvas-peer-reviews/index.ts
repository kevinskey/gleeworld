// canvas-peer-reviews — list peer reviews for an assignment, scoped
// either to those assigned to the caller (action='mine') or all
// (action='all', teacher view).
//
// Body: { action: 'mine' | 'all', course_id, assignment_id }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCanvasClientForTenant } from "../_shared/canvas.ts";
import { verifyClaims } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  const tenantId = (payload as any)?.tenant_id ?? (payload as any)?.app_metadata?.tenant_id;
  // deno-lint-ignore no-explicit-any
  const userId = (payload as any)?.sub;
  if (!tenantId || !userId) return err(400, "no_tenant_or_user_in_jwt");

  let body: { action?: string; course_id?: number; assignment_id?: number };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.course_id || !body.assignment_id) return err(400, "missing_ids");
  if (!body.action || !["mine", "all"].includes(body.action)) return err(400, "bad_action");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const resolved = await getCanvasClientForTenant(admin, tenantId);
  if (!resolved) return err(409, "canvas_not_bound");

  const { data: profile } = await admin
    .from("gw_profiles").select("canvas_user_id").eq("user_id", userId).maybeSingle();
  if (!profile?.canvas_user_id) return err(409, "canvas_user_not_provisioned");

  const cuid = profile.canvas_user_id;

  try {
    const all = await resolved.client.listPeerReviews({
      courseId: body.course_id, assignmentId: body.assignment_id, asUserId: cuid,
    });
    const filtered = body.action === "mine"
      ? all.filter((pr) => pr.assessor_id === cuid)
      : all;
    return new Response(JSON.stringify({
      ok: true,
      reviews: filtered.map((pr) => ({
        id: pr.id,
        user_id: pr.user_id,
        assessor_id: pr.assessor_id,
        workflow_state: pr.workflow_state,
        reviewee_name: pr.user?.name ?? `User ${pr.user_id}`,
        reviewee_avatar: pr.user?.avatar_url ?? null,
      })),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
