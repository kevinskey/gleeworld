// canvas-get-course — fetch a single course's metadata, modules, and
// assignments, scoped to the calling user.
//
// Body: { course_id: number }

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

  let body: { course_id?: number };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.course_id) return err(400, "missing_course_id");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const resolved = await getCanvasClientForTenant(admin, tenantId);
  if (!resolved) return err(409, "canvas_not_bound");
  const { client } = resolved;

  const { data: profile } = await admin
    .from("gw_profiles")
    .select("canvas_user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.canvas_user_id) return err(409, "canvas_user_not_provisioned");

  try {
    const [course, modules, assignments] = await Promise.all([
      client.getCourse(body.course_id, profile.canvas_user_id),
      client.listCourseModules(body.course_id, profile.canvas_user_id),
      client.listCourseAssignments(body.course_id, profile.canvas_user_id),
    ]);
    return new Response(JSON.stringify({
      ok: true,
      course: {
        id: course.id,
        name: course.name,
        code: course.course_code ?? null,
        syllabus_body: course.syllabus_body ?? null,
        start_at: course.start_at ?? null,
        end_at: course.end_at ?? null,
      },
      modules: modules.map((m) => ({
        id: m.id, name: m.name, position: m.position, items_count: m.items_count ?? 0,
      })),
      assignments: assignments.map((a) => ({
        id: a.id,
        name: a.name,
        due_at: a.due_at ?? null,
        points_possible: a.points_possible ?? null,
        submission_types: a.submission_types ?? [],
        has_submission: !!a.has_submitted_submissions,
      })),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
