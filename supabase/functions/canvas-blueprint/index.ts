// canvas-blueprint — blueprint course administration.
//
// Body actions:
//   status:      { action: 'status',      course_id } → associations + latest sync
//   set:         { action: 'set',         course_id, blueprint, restrictions? }
//   associate:   { action: 'associate',   course_id, add?: number[], remove?: number[] }
//   sync:        { action: 'sync',        course_id, comment?, publish_after_initial_sync? }

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

const ACTIONS = new Set(["status", "set", "associate", "sync"]);

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
    action?: string; course_id?: number;
    blueprint?: boolean;
    restrictions?: { content?: boolean; points?: boolean; due_dates?: boolean; availability_dates?: boolean };
    add?: number[]; remove?: number[];
    comment?: string; publish_after_initial_sync?: boolean;
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
    if (body.action === "status") {
      // Both calls can 404 if course isn't a blueprint — handle gracefully.
      const safe = async <T>(p: Promise<T>): Promise<T | null> => {
        try { return await p; } catch { return null; }
      };
      const [associations, migrations] = await Promise.all([
        safe(c.listBlueprintAssociations({ courseId: body.course_id, asUserId: cuid })),
        safe(c.getBlueprintMigrationStatus({ courseId: body.course_id, asUserId: cuid })),
      ]);
      return new Response(JSON.stringify({
        ok: true,
        is_blueprint: associations !== null || migrations !== null,
        associated_courses: associations ?? [],
        recent_migrations: migrations ?? [],
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "set") {
      if (body.blueprint === undefined) return err(400, "missing_blueprint_flag");
      const result = await c.setCourseBlueprint({
        courseId: body.course_id, asUserId: cuid,
        blueprint: body.blueprint, restrictions: body.restrictions,
      });
      return new Response(JSON.stringify({ ok: true, result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "associate") {
      if (!body.add?.length && !body.remove?.length) return err(400, "nothing_to_change");
      const result = await c.updateBlueprintAssociations({
        courseId: body.course_id, asUserId: cuid, add: body.add, remove: body.remove,
      });
      return new Response(JSON.stringify({ ok: true, result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "sync") {
      const migration = await c.syncBlueprint({
        courseId: body.course_id, asUserId: cuid,
        publish_after_initial_sync: body.publish_after_initial_sync,
        comment: body.comment,
      });
      return new Response(JSON.stringify({ ok: true, migration }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return err(400, "unhandled_action");
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
