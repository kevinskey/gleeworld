// canvas-course-tab — one edge function that fans out to whichever
// Canvas course sub-resource a tab needs. Saves us from writing a
// near-identical wrapper per tab.
//
// Body: { course_id: number, tab: 'quizzes' | 'discussions' | 'people' }

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

const SUPPORTED_TABS = new Set(["quizzes", "discussions", "people"]);

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

  let body: { course_id?: number; tab?: string };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.course_id) return err(400, "missing_course_id");
  if (!body.tab || !SUPPORTED_TABS.has(body.tab)) return err(400, "bad_tab");

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
    if (body.tab === "quizzes") {
      const quizzes = await client.listCourseQuizzes(body.course_id, profile.canvas_user_id);
      return new Response(JSON.stringify({
        ok: true,
        quizzes: quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          due_at: q.due_at ?? null,
          points_possible: q.points_possible ?? null,
          question_count: q.question_count ?? 0,
          published: q.published ?? false,
        })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.tab === "discussions") {
      const discs = await client.listCourseDiscussions(body.course_id, profile.canvas_user_id);
      return new Response(JSON.stringify({
        ok: true,
        discussions: discs.map((d) => ({
          id: d.id,
          title: d.title,
          posted_at: d.posted_at ?? null,
          last_reply_at: d.last_reply_at ?? null,
          replies: d.discussion_subentry_count ?? 0,
          unread: d.unread_count ?? 0,
          pinned: !!d.pinned,
          locked: !!d.locked,
        })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.tab === "people") {
      const enrolls = await client.listCourseEnrollments(body.course_id, profile.canvas_user_id);
      return new Response(JSON.stringify({
        ok: true,
        people: enrolls.map((e) => ({
          enrollment_id: e.id,
          user_id: e.user_id,
          name: e.user?.name ?? `User ${e.user_id}`,
          sortable_name: e.user?.sortable_name ?? null,
          avatar_url: e.user?.avatar_url ?? null,
          type: e.type,
          role: e.role,
          state: e.enrollment_state,
        })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return err(400, "unhandled_tab");
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
