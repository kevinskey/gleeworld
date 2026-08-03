// canvas-rubric — list/get/create/update/delete rubrics for a course.
//
// Body actions:
//   list:   { action: 'list',   course_id }
//   get:    { action: 'get',    course_id, rubric_id }
//   create: { action: 'create', course_id, title, criteria, free_form_criterion_comments?, assignment_id? }
//   update: { action: 'update', course_id, rubric_id, title, criteria, free_form_criterion_comments? }
//   delete: { action: 'delete', course_id, rubric_id }

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

const ACTIONS = new Set(["list", "get", "create", "update", "delete"]);

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

  let body: {
    action?: string; course_id?: number; rubric_id?: number;
    title?: string;
    free_form_criterion_comments?: boolean;
    assignment_id?: number;
    criteria?: Array<{
      description: string; long_description?: string; points: number;
      ratings: Array<{ description: string; long_description?: string; points: number }>;
    }>;
  };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.course_id) return err(400, "missing_course_id");
  if (!body.action || !ACTIONS.has(body.action)) return err(400, "bad_action");

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
    if (body.action === "list") {
      const rubrics = await c.listCourseRubrics(body.course_id, cuid);
      return new Response(JSON.stringify({ ok: true, rubrics }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.action === "get") {
      if (!body.rubric_id) return err(400, "missing_rubric_id");
      const rubric = await c.getRubric(body.course_id, body.rubric_id, cuid);
      return new Response(JSON.stringify({ ok: true, rubric }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.action === "create") {
      if (!body.title?.trim() || !body.criteria?.length) return err(400, "missing_title_or_criteria");
      const result = await c.createRubric({
        courseId: body.course_id, asUserId: cuid,
        title: body.title.trim(), criteria: body.criteria,
        free_form_criterion_comments: body.free_form_criterion_comments,
        assignment_id: body.assignment_id,
      });
      return new Response(JSON.stringify({ ok: true, result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.action === "update") {
      if (!body.rubric_id || !body.title?.trim() || !body.criteria?.length) return err(400, "missing_fields");
      await c.updateRubric({
        courseId: body.course_id, rubricId: body.rubric_id, asUserId: cuid,
        title: body.title.trim(), criteria: body.criteria,
        free_form_criterion_comments: body.free_form_criterion_comments,
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.action === "delete") {
      if (!body.rubric_id) return err(400, "missing_rubric_id");
      await c.deleteRubric(body.course_id, body.rubric_id, cuid);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return err(400, "unhandled_action");
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
