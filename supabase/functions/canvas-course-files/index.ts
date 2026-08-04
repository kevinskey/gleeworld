// canvas-course-files — list folders + files for a course. Optionally
// drill into a specific folder.
//
// Body: { course_id, folder_id? }

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

  let body: { course_id?: number; folder_id?: number };
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.course_id) return err(400, "missing_course_id");

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
    const folders = await c.listCourseFolders(body.course_id, cuid);
    // If no folder_id given, find the root (parent_folder_id == null).
    const root = folders.find((f) => f.parent_folder_id === null);
    const currentFolderId = body.folder_id ?? root?.id ?? null;
    if (!currentFolderId) {
      return new Response(JSON.stringify({
        ok: true, folder: null, folders: [], files: [], breadcrumb: [],
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const current = folders.find((f) => f.id === currentFolderId);
    const subfolders = folders.filter((f) => f.parent_folder_id === currentFolderId);
    const files = await c.listFolderFiles(currentFolderId, cuid);

    // Build breadcrumb by walking parent chain.
    const byId = new Map(folders.map((f) => [f.id, f]));
    const crumbs: Array<{ id: number; name: string }> = [];
    let walk = current ?? null;
    while (walk) {
      crumbs.unshift({ id: walk.id, name: walk.name });
      walk = walk.parent_folder_id ? byId.get(walk.parent_folder_id) ?? null : null;
    }

    return new Response(JSON.stringify({
      ok: true,
      folder: current ? { id: current.id, name: current.name } : null,
      folders: subfolders.map((f) => ({ id: f.id, name: f.name, files_count: f.files_count ?? 0, folders_count: f.folders_count ?? 0 })),
      files: files.map((f) => ({
        id: f.id, name: f.display_name ?? f.filename, size: f.size,
        content_type: f["content-type"], url: f.url, updated_at: f.updated_at,
      })),
      breadcrumb: crumbs,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return err(502, "canvas_request_failed", e instanceof Error ? e.message : String(e));
  }
});
