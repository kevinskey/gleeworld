// canvas-course-announcements — list + post announcements for a
// course. Posting requires teacher/admin on the Canvas side; Canvas
// enforces that for us.
//
// Body (list):   { action: 'list',   course_id }
// Body (create): { action: 'create', course_id, title, message }

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

  let body: { action?: string; course_id?: number; title?: string; message?: string };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.course_id) return err(400, "missing_course_id");
  if (!body.action || !["list", "create"].includes(body.action)) return err(400, "bad_action");

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

  try {
    if (body.action === "list") {
      const items = await resolved.client.listCourseAnnouncements(body.course_id, profile.canvas_user_id);
      return new Response(JSON.stringify({
        ok: true,
        announcements: items.map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message ?? null,
          posted_at: a.posted_at ?? null,
          author_name: a.author?.display_name ?? null,
          author_avatar: a.author?.avatar_image_url ?? null,
        })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // create
    if (!body.title?.trim() || !body.message?.trim()) return err(400, "missing_title_or_message");
    const created = await resolved.client.postAnnouncement({
      courseId: body.course_id,
      asUserId: profile.canvas_user_id,
      title: body.title.trim(),
      message: body.message.trim(),
    });
    return new Response(JSON.stringify({ ok: true, announcement: created }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
