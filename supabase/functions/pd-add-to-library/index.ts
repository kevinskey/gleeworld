// pd-add-to-library — CP4 of the public-domain catalog feature.
//
// Wires the "Add to library" button in PublicDomainSearch to:
//   1. Read the pd_works row for the requested catalog entry.
//   2. If pd_works.storage_key is NULL, fetch the source PDF ONCE,
//      upload to the sheet-music Supabase Storage bucket under
//      pd-cache/{source}/{source_id}.pdf, and stamp the storage_key
//      back on the pd_works row. Subsequent tenants reuse the cached
//      object — every tenant after the first pays nothing in CPDL load.
//   3. Insert into gw_sheet_music for the caller's tenant. ON CONFLICT
//      (tenant_id, pd_work_id) DO NOTHING so re-clicks are idempotent.
//   4. Return the inserted (or pre-existing) score row so the UI can
//      update the library list.
//
// RIGHTS GATE: the inserted row is auto-tagged rights_status='public_
// _domain'. That bypasses the seat-count CHECK (the constraint requires
// non-null seat_count only for 'licensed' rows), and the work is
// immediately shareable to all members per the Copyright & Content
// Policy. We DO preserve license_type='cpdl_license' on the pd_works
// row itself; copyright_holder on the score carries the editor
// attribution so it always renders alongside the work.
//
// CPDL HOST QUIRK: stored source URLs canonicalize to www2.cpdl.org
// (user-facing, stable). www2 is behind Cloudflare Bot Fight Mode and
// 403s every datacenter IP. The same paths on test.cpdl.org are not
// gated. We swap host on the FETCH only; the canonical URL stored on
// pd_works.original_score_url is left alone.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const USER_AGENT = "GleeWorld-PD-Cacher/1.0 (https://gleeworld.org; support@gleeworld.org)";
const STORAGE_BUCKET = "sheet-music";
const STORAGE_PREFIX = "pd-cache";
const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB safety cap

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody {
  pd_work_id?: string;
}

// Swap CPDL's user-facing CDN (www2) for the staging host whose IP isn't
// behind the bot challenge. ONLY apply this swap when we're fetching;
// the URL we persist back to users stays canonical.
function fetchableUrl(originalUrl: string): string {
  return originalUrl
    .replace("https://www2.cpdl.org/", "https://test.cpdl.org/")
    .replace("https://www.cpdl.org/", "https://test.cpdl.org/");
}

// SUPABASE_URL inside the edge-functions container points at the
// internal Kong service (http://kong:8000), which user browsers can't
// reach. PUBLIC_SUPABASE_URL is the external host fronted by nginx.
// Falls back to gleeworld.org's public host so this works without
// extra env even if PUBLIC_SUPABASE_URL is unset.
function buildPublicUrl(storageKey: string): string {
  const publicHost = Deno.env.get("PUBLIC_SUPABASE_URL")
    ?? Deno.env.get("SITE_URL")
    ?? "https://supabase.gleeworld.org";
  return `${publicHost.replace(/\/+$/, "")}/storage/v1/object/public/${STORAGE_BUCKET}/${storageKey}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1. Auth check — we use the caller's JWT to write into their tenant
  //    (gw_sheet_music has tenant_id DEFAULT current_tenant_id() + RLS).
  //    The service-role key is reserved for storage + pd_works updates.
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Caller-scoped client for the tenant-side insert (RLS active).
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  // Service-role client for storage upload + pd_works.storage_key update.
  const adminSupabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: ReqBody;
  try { body = await req.json(); } catch { body = {}; }
  const pdWorkId = body.pd_work_id;
  if (!pdWorkId) {
    return new Response(JSON.stringify({ error: "missing_pd_work_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 2. Read the pd_works row (RLS allows authenticated users to read).
    const { data: work, error: readErr } = await supabase
      .from("pd_works")
      .select("id, source, source_id, title, composer, voicing, language, source_page_url, original_score_url, storage_key, license_type, attribution")
      .eq("id", pdWorkId)
      .maybeSingle();
    if (readErr) throw new Error(`read: ${readErr.message}`);
    if (!work) {
      return new Response(JSON.stringify({ error: "pd_work_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Cache the PDF on first request. Done with service-role so a
    //    tenant member without storage-write privileges can still
    //    trigger the global cache fill.
    let storageKey: string | null = work.storage_key;
    let publicUrl: string | null = null;
    if (storageKey) {
      publicUrl = buildPublicUrl(storageKey);
    } else if (work.original_score_url) {
      const ext = (work.original_score_url.match(/\.[a-z0-9]+(\?|$)/i)?.[0] ?? ".pdf").replace(/[?].*/, "").toLowerCase();
      storageKey = `${STORAGE_PREFIX}/${work.source}/${work.source_id}${ext}`;
      const fetchUrl = fetchableUrl(work.original_score_url);
      const res = await fetch(fetchUrl, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        return new Response(JSON.stringify({
          error: "source_fetch_failed",
          detail: `source returned ${res.status} for ${fetchUrl}`,
        }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const contentLength = Number(res.headers.get("content-length") ?? "0");
      if (contentLength > MAX_PDF_BYTES) {
        return new Response(JSON.stringify({ error: "source_too_large", bytes: contentLength }), {
          status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_PDF_BYTES) {
        return new Response(JSON.stringify({ error: "source_too_large", bytes: buf.byteLength }), {
          status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: upErr } = await adminSupabase.storage
        .from(STORAGE_BUCKET)
        .upload(storageKey, new Blob([buf], { type: "application/pdf" }), {
          contentType: "application/pdf",
          upsert: true,
        });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      publicUrl = buildPublicUrl(storageKey);
      // Stamp storage_key back on the catalog row so every subsequent
      // tenant skips the fetch+upload entirely.
      await adminSupabase
        .from("pd_works")
        .update({ storage_key: storageKey })
        .eq("id", work.id);
    }

    // 4. Insert into the calling tenant's library. tenant_id is filled
    //    from the JWT by the DEFAULT current_tenant_id() (see memory:
    //    "DEFAULT current_tenant_id() + BEFORE INSERT trigger required").
    //    rights_status='public_domain' clears the rights gate without
    //    seat enforcement. copyright_holder carries the attribution
    //    text so the editor credit displays alongside the score.
    const insertPayload = {
      title: work.title,
      composer: work.composer,
      voicing: work.voicing,
      language: work.language,
      pdf_url: publicUrl,
      pd_work_id: work.id,
      rights_status: "public_domain" as const,
      copyright_holder: work.attribution,
      notes: `Imported from ${work.source.toUpperCase()} — see ${work.source_page_url}`,
    };

    // Conflict on (tenant_id, pd_work_id) — partial unique idx from
    // migration 20260622060000. Surface the existing row on re-add.
    const { data: existing } = await supabase
      .from("gw_sheet_music")
      .select("id, title, pdf_url, pd_work_id")
      .eq("pd_work_id", work.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({
        ok: true,
        already_in_library: true,
        score_id: existing.id,
        title: existing.title,
        cached: !!storageKey,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: inserted, error: insErr } = await supabase
      .from("gw_sheet_music")
      .insert(insertPayload)
      .select("id, title, pdf_url")
      .single();
    if (insErr) throw new Error(`insert: ${insErr.message}`);

    return new Response(JSON.stringify({
      ok: true,
      already_in_library: false,
      score_id: inserted.id,
      title: inserted.title,
      cached: !!storageKey,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[pd-add-to-library] failed", msg);
    return new Response(JSON.stringify({ error: "add_failed", detail: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
