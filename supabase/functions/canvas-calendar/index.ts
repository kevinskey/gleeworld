// canvas-calendar — aggregated upcoming events + assignment due dates
// across all of the user's enrolled courses.
//
// Body: { start_date, end_date }  (ISO date strings)

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

  let body: { start_date?: string; end_date?: string };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.start_date || !body.end_date) return err(400, "missing_dates");

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
    const courses = await c.listUserCourses(cuid);
    const contextCodes = courses.map((co) => `course_${co.id}`);
    if (contextCodes.length === 0) {
      return new Response(JSON.stringify({ ok: true, events: [], assignments: [], courses: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const courseNameById = new Map(courses.map((co) => [co.id, co.name]));

    const [events, assignments] = await Promise.all([
      c.listCalendarEvents({
        asUserId: cuid, contextCodes,
        startDate: body.start_date, endDate: body.end_date, type: "event",
      }),
      c.listCalendarEvents({
        asUserId: cuid, contextCodes,
        startDate: body.start_date, endDate: body.end_date, type: "assignment",
      }),
    ]);

    return new Response(JSON.stringify({
      ok: true,
      events: events.map((e) => ({
        id: String(e.id),
        title: e.title,
        start_at: e.start_at ?? null,
        end_at: e.end_at ?? null,
        all_day: !!e.all_day,
        context_code: e.context_code ?? null,
        course_name: courseNameById.get(Number((e.context_code ?? "").replace("course_", ""))) ?? null,
        html_url: e.html_url ?? null,
      })),
      assignments: assignments.map((e) => ({
        id: String(e.id),
        assignment_id: e.assignment?.id ?? null,
        title: e.title,
        due_at: e.assignment?.due_at ?? e.start_at ?? null,
        points_possible: e.assignment?.points_possible ?? null,
        course_id: e.assignment?.course_id ?? null,
        course_name: e.assignment?.course_id ? courseNameById.get(e.assignment.course_id) ?? null : null,
        html_url: e.html_url ?? null,
      })),
      courses: courses.map((co) => ({ id: co.id, name: co.name })),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
