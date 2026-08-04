// canvas-quiz — quiz + question CRUD. Teachers only (Canvas enforces).
//
// Body: { action, course_id, quiz_id?, question_id?, ... }
//   create_quiz:        { quiz: {...} }
//   update_quiz:        { quiz_id, quiz: {...} }
//   get_quiz:           { quiz_id } → quiz + questions
//   add_question:       { quiz_id, question: {...} }
//   update_question:    { quiz_id, question_id, question: {...} }
//   delete_question:    { quiz_id, question_id }

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

const ACTIONS = new Set([
  "create_quiz", "update_quiz", "get_quiz",
  "add_question", "update_question", "delete_question",
]);

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
    action?: string; course_id?: number; quiz_id?: number; question_id?: number;
    quiz?: Record<string, unknown>; question?: Record<string, unknown>;
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
    if (body.action === "create_quiz") {
      if (!body.quiz?.title) return err(400, "missing_quiz_title");
      // deno-lint-ignore no-explicit-any
      const result = await c.createQuiz({ courseId: body.course_id, asUserId: cuid, ...(body.quiz as any) });
      return new Response(JSON.stringify({ ok: true, quiz: result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.action === "update_quiz") {
      if (!body.quiz_id || !body.quiz) return err(400, "missing_quiz_id_or_data");
      const result = await c.updateQuiz({
        courseId: body.course_id, quizId: body.quiz_id, asUserId: cuid, quiz: body.quiz,
      });
      return new Response(JSON.stringify({ ok: true, quiz: result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.action === "get_quiz") {
      if (!body.quiz_id) return err(400, "missing_quiz_id");
      const [quiz, questions] = await Promise.all([
        c.getQuiz(body.course_id, body.quiz_id, cuid),
        c.listQuizQuestions(body.course_id, body.quiz_id, cuid),
      ]);
      return new Response(JSON.stringify({ ok: true, quiz, questions }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.action === "add_question") {
      if (!body.quiz_id || !body.question) return err(400, "missing_quiz_id_or_question");
      // deno-lint-ignore no-explicit-any
      const result = await c.addQuizQuestion({ courseId: body.course_id, quizId: body.quiz_id, asUserId: cuid, question: body.question as any });
      return new Response(JSON.stringify({ ok: true, question: result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.action === "update_question") {
      if (!body.quiz_id || !body.question_id || !body.question) return err(400, "missing_ids_or_question");
      const result = await c.updateQuizQuestion({
        courseId: body.course_id, quizId: body.quiz_id, questionId: body.question_id, asUserId: cuid, question: body.question,
      });
      return new Response(JSON.stringify({ ok: true, question: result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.action === "delete_question") {
      if (!body.quiz_id || !body.question_id) return err(400, "missing_ids");
      await c.deleteQuizQuestion({
        courseId: body.course_id, quizId: body.quiz_id, questionId: body.question_id, asUserId: cuid,
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return err(400, "unhandled_action");
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
