// canvas-create-course — instructor-only. Creates a course in the
// tenant's Canvas sub-account and auto-enrolls the creator as Teacher.
//
// Body: { name: string, course_code?: string }

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

  let body: { name?: string; course_code?: string };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.name?.trim()) return err(400, "name_required");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Authz: instructor / admin / super_admin only.
  const { data: profile } = await admin
    .from("gw_profiles")
    .select("role, is_admin, is_super_admin, canvas_user_id, email, full_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) return err(404, "profile_not_found");
  const canCreate = profile.is_admin || profile.is_super_admin || profile.role === "instructor";
  if (!canCreate) return err(403, "instructor_only");

  const resolved = await getCanvasClientForTenant(admin, tenantId);
  if (!resolved) return err(409, "canvas_not_bound");
  const { client, accountId } = resolved;

  // Provision Canvas user if first call for this instructor.
  let canvasUserId = profile.canvas_user_id;
  if (!canvasUserId) {
    try {
      const u = await client.ensureUser({ email: profile.email!, name: profile.full_name ?? undefined, accountId });
      canvasUserId = u.id;
      await admin.from("gw_profiles").update({ canvas_user_id: canvasUserId }).eq("user_id", userId);
    } catch (e) {
      return err(502, "canvas_user_provision_failed", e instanceof Error ? e.message : String(e));
    }
  }

  // Create the course + enroll creator as teacher.
  try {
    const course = await client.createCourse({
      accountId,
      name: body.name.trim(),
      courseCode: body.course_code?.trim() || undefined,
    });
    await client.enrollUser({ courseId: course.id, userId: canvasUserId!, type: "TeacherEnrollment" });
    return new Response(JSON.stringify({
      ok: true,
      course: { id: course.id, name: course.name, code: course.course_code ?? null },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return err(502, "canvas_create_failed", e instanceof Error ? e.message : String(e));
  }
});
