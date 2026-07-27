// ext-ingest-imslp — IMSLP (Petrucci Music Library) ingestion job.
//
// ARCHITECTURE: mirrors pd-ingest-cpdl. IMSLP's MediaWiki API is
// called ONLY here; end-user search hits ext_catalog_items.
//
// MODES (request body):
//   { "mode": "category", "category": "Category:For unaccompanied chorus",
//     "max_pages": 25, "delay_ms": 1000, "continue_token": "..." }
//   { "mode": "search",   "query": "Holst suite",
//     "max_pages": 25, "delay_ms": 1000, "continue_token": "..." }
//   { "mode": "allpages", "max_pages": 25, "delay_ms": 1000,
//     "continue_token": "..." }
//
// IDEMPOTENCY: upserts into ext_catalog_items keyed on (source, source_id).
//   source    = 'imslp'
//   source_id = the MediaWiki pageid as a string.
//
// AUTH: requires service-role key.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const IMSLP_API = Deno.env.get("IMSLP_API_BASE") ?? "https://imslp.org/api.php";
const IMSLP_PAGE_BASE = "https://imslp.org/wiki";
const USER_AGENT = "GleeWorld-Ext-Ingester/1.0 (https://gleeworld.org; support@gleeworld.org)";
const DEFAULT_DELAY_MS = 1000;
const DEFAULT_MAX_PAGES = 25;
const MAX_BACKOFF_MS = 30_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface IngestBody {
  mode?: "category" | "search" | "allpages";
  category?: string;
  query?: string;
  max_pages?: number;
  delay_ms?: number;
  continue_token?: string;
}

interface PageSummary { pageid: number; title: string; }

async function apiGet(params: Record<string, string>): Promise<any> {
  const url = new URL(IMSLP_API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("format", "json");
  url.searchParams.set("maxlag", "5");

  let attempt = 0;
  while (true) {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (res.ok) return await res.json();
    if (res.status === 429 || res.status === 503) {
      const backoff = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt++);
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }
    throw new Error(`IMSLP API ${res.status}: ${await res.text()}`);
  }
}

function inferEnsembleFromCategories(cats: string[]): string | null {
  const joined = cats.join(" | ").toLowerCase();
  if (joined.includes("chorus") || joined.includes("choir")) return "choral";
  if (joined.includes("band") || joined.includes("wind ensemble")) return "band";
  if (joined.includes("orchestra")) return "orchestra";
  if (joined.includes("chamber")) return "chamber";
  return null;
}

async function discover(body: IngestBody): Promise<{ pages: PageSummary[]; next: string | null }> {
  const mode = body.mode ?? "category";
  const params: Record<string, string> = { action: "query", list: "" };
  const limit = String(Math.min(body.max_pages ?? DEFAULT_MAX_PAGES, 50));

  if (mode === "category") {
    params.list = "categorymembers";
    params.cmtitle = body.category ?? "Category:For unaccompanied chorus";
    params.cmlimit = limit;
    params.cmtype = "page";
    if (body.continue_token) params.cmcontinue = body.continue_token;
    const j = await apiGet(params);
    return {
      pages: (j.query?.categorymembers ?? []).map((m: any) => ({ pageid: m.pageid, title: m.title })),
      next: j.continue?.cmcontinue ?? null,
    };
  }
  if (mode === "search") {
    params.list = "search";
    params.srsearch = body.query ?? "";
    params.srlimit = limit;
    if (body.continue_token) params.sroffset = body.continue_token;
    const j = await apiGet(params);
    return {
      pages: (j.query?.search ?? []).map((m: any) => ({ pageid: m.pageid, title: m.title })),
      next: j.continue?.sroffset ? String(j.continue.sroffset) : null,
    };
  }
  // allpages
  params.list = "allpages";
  params.aplimit = limit;
  params.apnamespace = "0";
  if (body.continue_token) params.apcontinue = body.continue_token;
  const j = await apiGet(params);
  return {
    pages: (j.query?.allpages ?? []).map((m: any) => ({ pageid: m.pageid, title: m.title })),
    next: j.continue?.apcontinue ?? null,
  };
}

async function resolvePage(pageid: number): Promise<{
  pageid: number;
  title: string;
  composer: string | null;
  voicing: string | null;
  language: string | null;
  ensemble: string | null;
  audio_preview_url: string | null;
} | null> {
  const j = await apiGet({
    action: "parse",
    pageid: String(pageid),
    prop: "categories|images|wikitext",
  });
  const parse = j.parse;
  if (!parse) return null;
  const title = parse.title as string;
  const cats: string[] = (parse.categories ?? []).map((c: any) => (c["*"] ?? "").replace(/_/g, " "));
  const composerCat = cats.find((c) => /works by /i.test(c) || /composer/i.test(c));
  const composer = composerCat ? composerCat.replace(/^works by /i, "").trim() : null;
  const voicingCat = cats.find((c) => /^for /i.test(c));
  const voicing = voicingCat ? voicingCat.replace(/^for /i, "").trim() : null;
  const images: string[] = (parse.images ?? []) as string[];
  const audioFile = images.find((f) => /\.(mp3|ogg)$/i.test(f));
  const audio_preview_url = audioFile
    ? `https://imslp.org/wiki/Special:FilePath/${encodeURIComponent(audioFile)}`
    : null;
  return {
    pageid,
    title,
    composer,
    voicing,
    language: null,
    ensemble: inferEnsembleFromCategories(cats),
    audio_preview_url,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const body: IngestBody = await req.json().catch(() => ({}));
  const delayMs = Math.max(200, body.delay_ms ?? DEFAULT_DELAY_MS);

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { pages, next } = await discover(body);
  let upserted = 0;

  for (const p of pages) {
    try {
      const resolved = await resolvePage(p.pageid);
      if (!resolved) continue;
      const source_page_url = `${IMSLP_PAGE_BASE}/${encodeURIComponent(resolved.title.replace(/ /g, "_"))}`;
      const { error } = await supa.from("ext_catalog_items").upsert({
        source: "imslp",
        source_id: String(resolved.pageid),
        title: resolved.title,
        composer: resolved.composer,
        voicing: resolved.voicing,
        language: resolved.language,
        ensemble_type: resolved.ensemble,
        source_page_url,
        audio_preview_url: resolved.audio_preview_url,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "source,source_id" });
      if (!error) upserted++;
    } catch (_e) {
      // swallow one-page failures; the crawler continues
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return new Response(
    JSON.stringify({ ok: true, processed: pages.length, upserted, next_continue: next }),
    { headers: { ...corsHeaders, "content-type": "application/json" } },
  );
});
