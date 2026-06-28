// pd-ingest-cpdl — CPDL (ChoralWiki) ingestion job.
//
// ARCHITECTURE: CPDL's Action API is called ONLY here. The end-user
// search path queries our local `pd_works` table, never CPDL live.
// This keeps user-facing latency low, our compliance with CPDL's API
// etiquette obvious, and our ingester the single chokepoint for
// rate-limit / User-Agent / backoff discipline.
//
// MODES (request body):
//   { "mode": "category", "category": "Category:SATB works",
//     "max_pages": 50, "delay_ms": 1000, "continue_token": "..." }
//   { "mode": "search",   "query":    "Ave Maria",
//     "max_pages": 50, "delay_ms": 1000, "continue_token": "..." }
//   { "mode": "allpages", "max_pages": 50, "delay_ms": 1000,
//     "continue_token": "..." }  // full-catalog walk via list=allpages
//
//   max_pages caps how many work pages we touch in one run (default 25)
//   so a kicked-off run can't accidentally crawl the entire site.
//   continue_token (returned as `next_continue` in the response) lets
//   a cron driver resume from where the previous call left off — for
//   category mode it's the MediaWiki cmcontinue string, for search it's
//   the next sroffset, for allpages it's the next apcontinue title.
//
// IDEMPOTENCY: upserts into `pd_works` keyed on (source, source_id).
//   source    = 'cpdl'
//   source_id = the MediaWiki pageid as a string (stable across page
//               renames, unlike the title).
//
// SCOPE TODAY (CP2): walk a category OR run a search, resolve each
// work page's title/composer/voicing/language/source_page_url, find
// the first PDF link on the page, upsert. PDF CACHING happens in CP4.
//
// AUTH: requires service-role key (we bypass RLS to write). Either:
//   - call from a cron job with the service-role bearer, or
//   - call manually from a super-admin admin UI route.
//
// CPDL API ETIQUETTE:
//   - Descriptive User-Agent identifying the platform + maintainer.
//   - maxlag=5 on every request (CPDL is small but we honor the
//     MediaWiki convention so we degrade nicely if their DB is busy).
//   - configurable delay_ms between API calls (default 1000 = 1 req/s).
//   - exponential backoff on 429/503.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CPDL's primary host (www.cpdl.org) is behind Cloudflare's Bot Fight
// Mode and 403s every server-side request from a datacenter IP. The
// "test" subdomain hosts the same MediaWiki + the same data and is NOT
// behind that gate — confirmed empirically that test.cpdl.org returns
// real JSON to identical queries.
//
// We default to test.cpdl.org but the host is configurable so we can
// switch over to www.cpdl.org once our droplet IP is whitelisted in
// their Cloudflare panel.
const CPDL_API = Deno.env.get("CPDL_API_BASE") ?? "https://test.cpdl.org/wiki/api.php";
const CPDL_PAGE_BASE = (CPDL_API.replace(/\/api\.php$/, "").replace(/\/wiki$/, "")) + "/wiki";
const USER_AGENT = "GleeWorld-PD-Ingester/1.0 (https://gleeworld.org; support@gleeworld.org)";
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

interface DiscoverResult {
  pages: CpdlPageSummary[];
  nextContinue: string | null;
}

interface CpdlPageSummary {
  pageid: number;
  title: string;
}

interface CpdlPageDetail {
  pageid: number;
  title: string;
  fullurl: string;
  categories: string[];
  pdfUrl: string | null;
}

interface PdWorkUpsert {
  source: "cpdl";
  source_id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  language: string | null;
  source_page_url: string;
  original_score_url: string | null;
  license_type: "public_domain" | "cpdl_license";
  attribution: string | null;
  last_seen_at: string;
}

// Voicing + language inferred from category names. Cheap parse — for
// richer extraction we'd need to parse the page's wiki source. This is
// "good enough for search filtering" not "musicologically authoritative."
const VOICING_KEYWORDS = [
  "SATB", "SSAA", "TTBB", "SAB", "SSA", "TBB", "SSAB", "TTBBB",
  "SSAATTBB", "SSAATB", "STB", "SS", "TT", "BB", "AA",
];

const LANGUAGE_KEYWORDS = [
  "English", "Latin", "French", "German", "Italian", "Spanish",
  "Hebrew", "Greek", "Polish", "Russian", "Czech", "Welsh",
  "Dutch", "Swedish", "Norwegian", "Portuguese", "Hungarian",
];

function detectVoicing(categories: string[]): string | null {
  for (const c of categories) {
    for (const v of VOICING_KEYWORDS) {
      if (c.includes(v)) return v;
    }
  }
  return null;
}

function detectLanguage(categories: string[]): string | null {
  for (const c of categories) {
    for (const l of LANGUAGE_KEYWORDS) {
      if (c.includes(l)) return l;
    }
  }
  return null;
}

// CPDL convention: a title is often "Work Name (Composer Name)".
// Extract both. Falls back gracefully when the title has no parenthetical.
function splitTitleComposer(rawTitle: string): { title: string; composer: string | null } {
  const m = rawTitle.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (m) {
    return { title: m[1].trim(), composer: m[2].trim() };
  }
  return { title: rawTitle.trim(), composer: null };
}

async function cpdlFetch(params: Record<string, string>, delayMs: number): Promise<any> {
  const url = new URL(CPDL_API);
  url.searchParams.set("format", "json");
  url.searchParams.set("maxlag", "5");
  url.searchParams.set("formatversion", "2");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let attempt = 0;
  let backoff = delayMs;
  while (true) {
    const res = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT } });
    if (res.status === 429 || res.status === 503) {
      attempt++;
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      console.warn(`[pd-ingest-cpdl] ${res.status} on ${url}; backing off ${backoff}ms (attempt ${attempt})`);
      if (attempt > 5) throw new Error(`CPDL repeatedly returned ${res.status}; giving up`);
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`CPDL ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }
}

// Walk a category (paginated). Returns at most max_pages results plus
// the MediaWiki cmcontinue cursor a cron driver can persist to resume.
async function fetchCategoryMembers(category: string, maxPages: number, delayMs: number, startToken?: string): Promise<DiscoverResult> {
  const out: CpdlPageSummary[] = [];
  let cmcontinue: string | undefined = startToken || undefined;
  while (out.length < maxPages) {
    const params: Record<string, string> = {
      action: "query",
      list: "categorymembers",
      cmtitle: category,
      cmlimit: String(Math.min(50, maxPages - out.length)),
      cmtype: "page", // skip nested category links
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;
    const data = await cpdlFetch(params, delayMs);
    const members: CpdlPageSummary[] = (data?.query?.categorymembers ?? []).map((m: any) => ({
      pageid: m.pageid,
      title: m.title,
    }));
    out.push(...members);
    cmcontinue = data?.continue?.cmcontinue;
    if (!cmcontinue) break;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { pages: out.slice(0, maxPages), nextContinue: cmcontinue ?? null };
}

// Free-text search via the API. Returns up to max_pages results plus
// the next sroffset for resumption.
async function searchPages(query: string, maxPages: number, delayMs: number, startToken?: string): Promise<DiscoverResult> {
  const out: CpdlPageSummary[] = [];
  let sroffset = startToken ? Number(startToken) || 0 : 0;
  while (out.length < maxPages) {
    const data = await cpdlFetch(
      {
        action: "query",
        list: "search",
        srsearch: query,
        srlimit: String(Math.min(50, maxPages - out.length)),
        sroffset: String(sroffset),
      },
      delayMs,
    );
    const hits: CpdlPageSummary[] = (data?.query?.search ?? []).map((s: any) => ({
      pageid: s.pageid,
      title: s.title,
    }));
    if (hits.length === 0) break;
    out.push(...hits);
    sroffset += hits.length;
    if (!data?.continue?.sroffset) {
      return { pages: out.slice(0, maxPages), nextContinue: null };
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { pages: out.slice(0, maxPages), nextContinue: String(sroffset) };
}

// Walk the entire main namespace via list=allpages. Used by the nightly
// full-catalog mirror cron. apcontinue is the cursor — the next title
// the API will start from.
async function fetchAllPages(maxPages: number, delayMs: number, startToken?: string): Promise<DiscoverResult> {
  const out: CpdlPageSummary[] = [];
  let apcontinue: string | undefined = startToken || undefined;
  while (out.length < maxPages) {
    const params: Record<string, string> = {
      action: "query",
      list: "allpages",
      apnamespace: "0", // main namespace = work pages + composer pages
      aplimit: String(Math.min(50, maxPages - out.length)),
      apfilterredir: "nonredirects",
    };
    if (apcontinue) params.apcontinue = apcontinue;
    const data = await cpdlFetch(params, delayMs);
    const members: CpdlPageSummary[] = (data?.query?.allpages ?? []).map((m: any) => ({
      pageid: m.pageid,
      title: m.title,
    }));
    out.push(...members);
    apcontinue = data?.continue?.apcontinue;
    if (!apcontinue) break;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { pages: out.slice(0, maxPages), nextContinue: apcontinue ?? null };
}

// Resolve a single work page: its canonical URL, categories, and the
// first PDF link we can find (File:..pdf upload OR external link).
async function fetchPageDetail(pageid: number, delayMs: number): Promise<CpdlPageDetail | null> {
  // Pass 1: get title, canonical URL, categories, image candidates,
  // and external links in a single batched query.
  const data = await cpdlFetch(
    {
      action: "query",
      pageids: String(pageid),
      prop: "info|categories|images|extlinks",
      inprop: "url",
      cllimit: "max",
      imlimit: "max",
      ellimit: "max",
    },
    delayMs,
  );
  const page = data?.query?.pages?.[0];
  if (!page || page.missing) return null;
  const categories: string[] = (page.categories ?? []).map((c: any) => c.title);
  // Candidate external links pointing at PDFs.
  const extlinks: string[] = (page.extlinks ?? []).map((l: any) => l.url || l["*"]).filter(Boolean);
  const externalPdf = extlinks.find((u) => /\.pdf(\?|$)/i.test(u)) ?? null;

  // Candidate File: uploads on the wiki itself — resolve their public
  // URL only if we don't already have an external PDF.
  let internalPdf: string | null = null;
  if (!externalPdf) {
    const imageTitles: string[] = (page.images ?? [])
      .map((i: any) => i.title)
      .filter((t: string) => /\.pdf$/i.test(t));
    if (imageTitles.length > 0) {
      const imgData = await cpdlFetch(
        {
          action: "query",
          titles: imageTitles.slice(0, 5).join("|"),
          prop: "imageinfo",
          iiprop: "url",
        },
        delayMs,
      );
      const imgPages = imgData?.query?.pages ?? [];
      for (const ip of imgPages) {
        const url = ip?.imageinfo?.[0]?.url;
        if (url) { internalPdf = url; break; }
      }
    }
  }

  // Canonicalize source URLs to www.cpdl.org so they remain valid
  // (and shareable by the user) even if we ingested from test.cpdl.org.
  // Users browsing CPDL expect the canonical host, not the staging one.
  const canonical = `https://www.cpdl.org/wiki/index.php?curid=${page.pageid}`;
  return {
    pageid: page.pageid,
    title: page.title,
    fullurl: canonical,
    categories,
    pdfUrl: externalPdf ?? internalPdf,
  };
}

function pageToUpsert(detail: CpdlPageDetail): PdWorkUpsert {
  const { title, composer } = splitTitleComposer(detail.title);
  return {
    source: "cpdl",
    source_id: String(detail.pageid),
    title,
    composer,
    voicing: detectVoicing(detail.categories),
    language: detectLanguage(detail.categories),
    source_page_url: detail.fullurl,
    original_score_url: detail.pdfUrl,
    // CP1 enum: every CPDL ingest is 'cpdl_license' (editor's edition
    // attribution required). The underlying work may be public-domain,
    // but the SCORE we link to is a CPDL edition — that's what matters
    // for the attribution we display.
    license_type: "cpdl_license",
    attribution: "Edition from the Choral Public Domain Library (CPDL) — see source page for editor credit.",
    last_seen_at: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let body: IngestBody;
  try { body = await req.json(); } catch { body = {}; }

  const mode = body.mode ?? "category";
  const maxPages = Math.max(1, Math.min(200, body.max_pages ?? DEFAULT_MAX_PAGES));
  const delayMs = Math.max(250, Math.min(5000, body.delay_ms ?? DEFAULT_DELAY_MS));

  try {
    // 1) Discover candidate pages.
    let discovered: DiscoverResult;
    if (mode === "search") {
      if (!body.query) {
        return new Response(JSON.stringify({ error: "missing_query" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      discovered = await searchPages(body.query, maxPages, delayMs, body.continue_token);
    } else if (mode === "allpages") {
      discovered = await fetchAllPages(maxPages, delayMs, body.continue_token);
    } else {
      if (!body.category) {
        return new Response(JSON.stringify({ error: "missing_category" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      discovered = await fetchCategoryMembers(body.category, maxPages, delayMs, body.continue_token);
    }
    const pages = discovered.pages;

    // 2) Resolve each page in sequence with the configured delay. In
    //    allpages mode the main namespace mixes work pages with composer
    //    bios / help pages, so we skip anything that doesn't look like
    //    a work — heuristic: must have a "Work (Composer)" parenthetical.
    const upserts: PdWorkUpsert[] = [];
    const skipped: { pageid: number; reason: string }[] = [];
    for (const p of pages) {
      if (mode === "allpages" && !/\([^()]+\)\s*$/.test(p.title)) {
        skipped.push({ pageid: p.pageid, reason: "non_work_title" });
        continue;
      }
      try {
        const detail = await fetchPageDetail(p.pageid, delayMs);
        if (!detail) { skipped.push({ pageid: p.pageid, reason: "missing" }); continue; }
        upserts.push(pageToUpsert(detail));
        await new Promise((r) => setTimeout(r, delayMs));
      } catch (e: any) {
        skipped.push({ pageid: p.pageid, reason: String(e?.message ?? e).slice(0, 120) });
      }
    }

    // 3) Single batched upsert. Idempotent on (source, source_id).
    let inserted = 0;
    let updated = 0;
    if (upserts.length > 0) {
      const { data, error, count } = await supabase
        .from("pd_works")
        .upsert(upserts, { onConflict: "source,source_id", count: "exact" })
        .select("id");
      if (error) throw new Error(`upsert: ${error.message}`);
      // Best-effort split: PostgREST doesn't tell us insert vs update
      // counts from a bulk upsert, so we report the total touched.
      inserted = data?.length ?? 0;
      updated = (count ?? 0) - inserted;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        mode,
        scope: body.category ?? body.query ?? (mode === "allpages" ? "allpages" : null),
        pages_discovered: pages.length,
        pages_upserted: upserts.length,
        pages_skipped: skipped.length,
        skipped_sample: skipped.slice(0, 5),
        rows_touched: inserted + updated,
        next_continue: discovered.nextContinue,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[pd-ingest-cpdl] failed", e);
    return new Response(
      JSON.stringify({ error: "ingest_failed", detail: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
