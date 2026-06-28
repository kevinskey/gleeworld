// canvas-course-grades — the calling user's overall grade for a course
// plus their per-assignment scores. Body: { course_id }.
//
// Combines Canvas's enrollment summary (current_score / final_score)
// with the per-assignment list so the GleeWorld grades page can render
// both the overall column and the assignment breakdown in one call.

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
    const [grades, assignments] = await Promise.all([
      client.getCourseGradesForUser(body.course_id, profile.canvas_user_id),
      client.listCourseAssignments(body.course_id, profile.canvas_user_id),
    ]);
    const enrollment = grades.enrollments.find((e) => /student/i.test(e.role)) ?? grades.enrollments[0];
    return new Response(JSON.stringify({
      ok: true,
      overall: {
        current_score: enrollment?.grades?.current_score ?? null,
        final_score: enrollment?.grades?.final_score ?? null,
        current_grade: enrollment?.grades?.current_grade ?? null,
        final_grade: enrollment?.grades?.final_grade ?? null,
      },
      assignments: assignments.map((a) => ({
        id: a.id,
        name: a.name,
        due_at: a.due_at ?? null,
        points_possible: a.points_possible ?? null,
      })),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
