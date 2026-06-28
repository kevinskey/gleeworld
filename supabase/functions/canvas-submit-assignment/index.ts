// canvas-submit-assignment — finalize a submission. For file uploads,
// the browser has already POSTed the file directly to Canvas's signed
// URL and got back file_ids — those come in via `file_ids`.
//
// Body: {
//   course_id, assignment_id,
//   submission_type: 'online_text_entry' | 'online_url' | 'online_upload',
//   body?, url?, file_ids?, comment?
// }

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

const ALLOWED_TYPES = new Set([
  "online_text_entry", "online_url", "online_upload", "media_recording",
]);

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
    course_id?: number; assignment_id?: number;
    submission_type?: string;
    body?: string; url?: string; file_ids?: number[]; comment?: string;
  };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.course_id || !body.assignment_id) return err(400, "missing_ids");
  if (!body.submission_type || !ALLOWED_TYPES.has(body.submission_type)) {
    return err(400, "bad_submission_type");
  }
  if (body.submission_type === "online_text_entry" && !body.body?.trim()) {
    return err(400, "missing_body");
  }
  if (body.submission_type === "online_url" && !body.url?.trim()) {
    return err(400, "missing_url");
  }
  if (body.submission_type === "online_upload" && (!body.file_ids?.length)) {
    return err(400, "missing_file_ids");
  }

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
    const result = await resolved.client.submitAssignment({
      courseId: body.course_id,
      assignmentId: body.assignment_id,
      asUserId: profile.canvas_user_id,
      submission_type: body.submission_type as "online_text_entry" | "online_url" | "online_upload",
      body: body.body,
      url: body.url,
      file_ids: body.file_ids,
      comment: body.comment,
    });
    return new Response(JSON.stringify({ ok: true, submission: result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
