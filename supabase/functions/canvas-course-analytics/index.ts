// canvas-course-analytics — fetch all three analytics summaries for
// a course in parallel: student summaries, assignment stats, activity
// histogram.
//
// Body: { course_id }

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

  const { data: profile } = await admin
    .from("gw_profiles").select("canvas_user_id").eq("user_id", userId).maybeSingle();
  if (!profile?.canvas_user_id) return err(409, "canvas_user_not_provisioned");

  const cuid = profile.canvas_user_id;
  const c = resolved.client;

  try {
    // Each analytics call independently can 404 in some Canvas configs
    // (e.g. analytics plugin disabled). Soft-fail per call.
    const safe = async <T>(p: Promise<T>): Promise<T | null> => {
      try { return await p; } catch { return null; }
    };

    const [students, assignments, activity, enrollments] = await Promise.all([
      safe(c.getCourseStudentSummaries(body.course_id, cuid)),
      safe(c.getCourseAssignmentAnalytics(body.course_id, cuid)),
      safe(c.getCourseActivity(body.course_id, cuid)),
      safe(c.listCourseEnrollments(body.course_id, cuid)),
    ]);

    const nameById = new Map<number, string>();
    if (enrollments) for (const e of enrollments) {
      if (e.user?.name) nameById.set(e.user_id, e.user.name);
    }

    return new Response(JSON.stringify({
      ok: true,
      student_summaries: (students ?? []).map((s) => ({
        user_id: s.id,
        name: nameById.get(s.id) ?? `User ${s.id}`,
        page_views: s.page_views,
        participations: s.participations,
        on_time: s.tardiness_breakdown?.on_time ?? 0,
        late: s.tardiness_breakdown?.late ?? 0,
        missing: s.tardiness_breakdown?.missing ?? 0,
      })),
      assignments: (assignments ?? []).map((a) => ({
        assignment_id: a.assignment_id,
        title: a.title,
        points_possible: a.points_possible,
        due_at: a.due_at ?? null,
        muted: !!a.muted,
        min_score: a.min_score ?? null,
        max_score: a.max_score ?? null,
        median: a.median ?? null,
        on_time: a.tardiness_breakdown?.on_time ?? a.status?.on_time ?? 0,
        late: a.tardiness_breakdown?.late ?? a.status?.late ?? 0,
        missing: a.tardiness_breakdown?.missing ?? a.status?.missing ?? 0,
      })),
      activity: activity ?? { by_date: [], by_category: [] },
      total_students: (students ?? []).length,
      analytics_disabled: !students && !assignments && !activity,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
