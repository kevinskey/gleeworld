// canvas-gradebook — list submissions for an assignment + update one.
//
// Body (list):   { action: 'list', course_id, assignment_id }
// Body (update): { action: 'update', course_id, assignment_id, user_id, posted_grade?, comment? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCanvasClientForTenant } from "../_shared/canvas.ts";

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

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return err(401, "unauthorized");
  const payload = decodeJwtPayload(jwt);
  // deno-lint-ignore no-explicit-any
  const tenantId = (payload as any)?.tenant_id ?? (payload as any)?.app_metadata?.tenant_id;
  // deno-lint-ignore no-explicit-any
  const userId = (payload as any)?.sub;
  if (!tenantId || !userId) return err(400, "no_tenant_or_user_in_jwt");

  let body: {
    action?: string; course_id?: number; assignment_id?: number;
    user_id?: number; posted_grade?: string; comment?: string;
    rubric_assessment?: Record<string, { points?: number; rating_id?: string; comments?: string }>;
  };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.action || !["list", "update"].includes(body.action)) return err(400, "bad_action");
  if (!body.course_id || !body.assignment_id) return err(400, "missing_ids");

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
    if (body.action === "list") {
      const subs = await resolved.client.listAssignmentSubmissions({
        courseId: body.course_id, assignmentId: body.assignment_id, asUserId: cuid,
      });
      return new Response(JSON.stringify({
        ok: true,
        submissions: subs.map((s) => ({
          id: s.id,
          user_id: s.user_id,
          user_name: s.user?.name ?? `User ${s.user_id}`,
          user_avatar: s.user?.avatar_url ?? null,
          sortable_name: s.user?.sortable_name ?? null,
          score: s.score,
          grade: s.grade,
          submitted_at: s.submitted_at,
          late: s.late,
          missing: s.missing,
          workflow_state: s.workflow_state,
        })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "update") {
      if (!body.user_id) return err(400, "missing_user_id");
      if (body.posted_grade === undefined && !body.comment && !body.rubric_assessment) {
        return err(400, "nothing_to_update");
      }
      const result = await resolved.client.updateSubmission({
        courseId: body.course_id, assignmentId: body.assignment_id,
        userId: body.user_id, asUserId: cuid,
        posted_grade: body.posted_grade, comment: body.comment,
        rubric_assessment: body.rubric_assessment,
      });
      return new Response(JSON.stringify({ ok: true, result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return err(400, "unhandled_action");
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
