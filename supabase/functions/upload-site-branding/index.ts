// upload-site-branding
//
// Server-side proxy for site-branding uploads. The client sends the file
// as base64 in a POST body; the edge fn writes it to Storage using the
// service-role client, then returns the public URL.
//
// Motivation: direct browser -> storage POSTs sometimes fail with
// net::ERR_TIMED_OUT for specific clients (ISP middleboxes, MTU issues,
// odd routes). Everything else on supabase.gleeworld.org (REST, edge fns)
// works fine from the same session, so bouncing off an edge fn avoids
// the flaky direct path entirely.
//
// Auth: standard user JWT + tenant-admin gate. Server does its own RLS-
// equivalent check on gw_profiles (is_admin / is_super_admin / role).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonError(401, "Missing authorization header");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonError(401, "Not signed in");

    const { data: profile } = await supabase
      .from("gw_profiles")
      .select("is_admin, is_super_admin, role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return jsonError(403, "Profile not found");

    const canManage = profile.is_super_admin === true
      || profile.is_admin === true
      || profile.role === "admin"
      || profile.role === "super_admin"
      || profile.role === "super-admin"
      || profile.role === "owner";
    if (!canManage) return jsonError(403, "Only tenant admins can upload");

    const body = await req.json().catch(() => ({}));
    const { file_base64, filename, prefix, content_type, source_url } = body as {
      file_base64?: string; filename?: string; prefix?: string;
      content_type?: string; source_url?: string;
    };
    if (!prefix || typeof prefix !== "string") return jsonError(400, "prefix required");
    if (!/^[a-z0-9-]+$/.test(prefix)) return jsonError(400, "prefix must match [a-z0-9-]+");
    if (!file_base64 && !source_url) {
      return jsonError(400, "file_base64 or source_url required");
    }

    let bytes: Uint8Array;
    let ct: string;
    let ext: string;

    if (source_url) {
      // Server-side download. Bypasses browser CORS/permission issues
      // and gives the tenant an independent copy so their storefront
      // doesn't break if the source URL rot.
      if (!/^https:\/\//i.test(source_url)) {
        return jsonError(400, "source_url must be https://");
      }
      let fetched: Response;
      try {
        fetched = await fetch(source_url, {
          redirect: "follow",
          headers: { "User-Agent": "GleeWorld-hero-download/1.0" },
        });
      } catch (err) {
        return jsonError(502, `Couldn't fetch source URL: ${err instanceof Error ? err.message : "network error"}`);
      }
      if (!fetched.ok) {
        return jsonError(502, `Source URL returned ${fetched.status}`);
      }
      const buf = await fetched.arrayBuffer();
      bytes = new Uint8Array(buf);
      if (bytes.length > 10 * 1024 * 1024) {
        return jsonError(413, "Downloaded image is over 10 MB");
      }
      ct = fetched.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
      if (!ct.startsWith("image/")) {
        return jsonError(415, `Source URL did not return an image (${ct})`);
      }
      const guessExt = ct.split("/")[1]?.replace("jpeg", "jpg") || "png";
      ext = guessExt.replace(/[^a-z0-9]/g, "").slice(0, 6) || "png";
    } else {
      // Base64 upload path (original behavior).
      bytes = Uint8Array.from(atob(file_base64!), (c) => c.charCodeAt(0));
      if (bytes.length > 10 * 1024 * 1024) {
        return jsonError(413, "Image must be 10 MB or smaller");
      }
      ext = (filename?.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "png";
      ct = content_type || "image/png";
    }

    const path = `${prefix}-${Date.now()}.${ext}`;

    // Service-role client: writes bypass RLS. We already gated the caller
    // above, so this is safe.
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { error: upErr } = await admin.storage
      .from("site-branding")
      .upload(path, bytes, { cacheControl: "3600", upsert: false, contentType: ct });
    if (upErr) {
      console.error("[upload-site-branding] storage failed:", upErr);
      return jsonError(502, `Storage failed: ${upErr.message}`);
    }

    const publicUrl = admin.storage.from("site-branding").getPublicUrl(path).data.publicUrl;
    return jsonOk({ path, url: publicUrl });
  } catch (err) {
    console.error("[upload-site-branding] unhandled", err);
    return jsonError(500, err instanceof Error ? err.message : "Unknown error");
  }
});

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
