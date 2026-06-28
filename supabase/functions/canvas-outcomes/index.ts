// canvas-outcomes — outcomes + Learning Mastery for a course.
//
// Body:
//   list:    { action: 'list', course_id }   → outcome groups + outcomes
//   create:  { action: 'create', course_id, group_id?, title, description?, mastery_points, points_possible, ratings }
//   rollups: { action: 'rollups', course_id } → per-student outcome scores

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

const ACTIONS = new Set(["list", "create", "rollups"]);

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
    action?: string; course_id?: number; group_id?: number;
    title?: string; description?: string;
    points_possible?: number; mastery_points?: number;
    ratings?: Array<{ description: string; points: number }>;
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
      const root = await c.getRootOutcomeGroup(body.course_id, cuid);
      const outcomes = await c.listOutcomesInGroup(body.course_id, root.id, cuid);
      return new Response(JSON.stringify({
        ok: true,
        root_group: { id: root.id, title: root.title },
        outcomes: outcomes.map((o) => ({
          id: o.outcome.id,
          title: o.outcome.title,
          description: o.outcome.description ?? null,
          points_possible: o.outcome.points_possible,
          mastery_points: o.outcome.mastery_points,
          ratings: o.outcome.ratings ?? [],
        })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "create") {
      if (!body.title?.trim() || body.mastery_points === undefined || !body.ratings?.length) {
        return err(400, "missing_fields");
      }
      const root = body.group_id ?? (await c.getRootOutcomeGroup(body.course_id, cuid)).id;
      const result = await c.createOutcome({
        courseId: body.course_id, groupId: root, asUserId: cuid,
        title: body.title.trim(), description: body.description,
        points_possible: body.points_possible ?? Math.max(...body.ratings.map((r) => r.points)),
        mastery_points: body.mastery_points, ratings: body.ratings,
      });
      return new Response(JSON.stringify({ ok: true, outcome: result.outcome }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "rollups") {
      const rollup = await c.getOutcomeRollups(body.course_id, cuid);
      const outcomes = rollup.linked?.outcomes ?? [];
      const users = rollup.linked?.users ?? [];
      return new Response(JSON.stringify({
        ok: true,
        outcomes: outcomes.map((o) => ({ id: o.id, title: o.title, mastery_points: o.mastery_points })),
        users: users.map((u) => ({ id: u.id, name: u.name })),
        rollups: rollup.rollups.map((r) => ({
          user_id: Number(r.links.user),
          scores: r.scores.map((s) => ({
            outcome_id: Number(s.links.outcome), score: s.score,
          })),
        })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return err(400, "unhandled_action");
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
