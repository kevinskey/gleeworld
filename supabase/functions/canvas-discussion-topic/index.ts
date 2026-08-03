// canvas-discussion-topic — discussion topic operations.
//
// Body (list_entries):  { action: 'list_entries', course_id, topic_id }
// Body (post_entry):    { action: 'post_entry', course_id, topic_id, message }
// Body (reply):         { action: 'reply', course_id, topic_id, entry_id, message }
// Body (create_topic):  { action: 'create_topic', course_id, title, message }

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

const ACTIONS = new Set(["list_entries", "post_entry", "reply", "create_topic"]);

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
    action?: string; course_id?: number; topic_id?: number; entry_id?: number;
    title?: string; message?: string;
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

  try {
    if (body.action === "list_entries") {
      if (!body.topic_id) return err(400, "missing_topic_id");
      const entries = await resolved.client.listDiscussionEntries({
        courseId: body.course_id, topicId: body.topic_id, asUserId: cuid,
      });
      return new Response(JSON.stringify({
        ok: true,
        entries: entries.map((e) => ({
          id: e.id,
          user_id: e.user_id,
          user_name: e.user_name ?? `User ${e.user_id}`,
          message: e.message,
          created_at: e.created_at,
          replies: (e.recent_replies ?? []).map((r) => ({
            id: r.id, user_id: r.user_id, user_name: r.user_name ?? `User ${r.user_id}`,
            message: r.message, created_at: r.created_at,
          })),
        })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "post_entry") {
      if (!body.topic_id) return err(400, "missing_topic_id");
      if (!body.message?.trim()) return err(400, "missing_message");
      const created = await resolved.client.postDiscussionEntry({
        courseId: body.course_id, topicId: body.topic_id, asUserId: cuid, message: body.message.trim(),
      });
      return new Response(JSON.stringify({ ok: true, entry: created }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "reply") {
      if (!body.topic_id || !body.entry_id) return err(400, "missing_ids");
      if (!body.message?.trim()) return err(400, "missing_message");
      const created = await resolved.client.replyToDiscussionEntry({
        courseId: body.course_id, topicId: body.topic_id, entryId: body.entry_id, asUserId: cuid, message: body.message.trim(),
      });
      return new Response(JSON.stringify({ ok: true, entry: created }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "create_topic") {
      if (!body.title?.trim() || !body.message?.trim()) return err(400, "missing_title_or_message");
      const created = await resolved.client.createDiscussionTopic({
        courseId: body.course_id, asUserId: cuid, title: body.title.trim(), message: body.message.trim(),
      });
      return new Response(JSON.stringify({ ok: true, topic: created }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return err(400, "unhandled_action");
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
