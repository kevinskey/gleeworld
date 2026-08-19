# Repertoire Search — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an in-app unified repertoire browser at `/dashboard/repertoire` that lets choral & band directors search AND browse featured selections across CPDL (already ingested), IMSLP, and a future-proofed external-catalog table — with audio sample playback where the source offers it — without leaving GleeWorld.

**Architecture:** Add a global `ext_catalog_items` table that mirrors `pd_works`' shape but carries commercial/multi-source fields (price, publisher, editors_choice, audio_preview_url, product_url, affiliate_url, ensemble_type). A single `repertoire_search()` RPC UNIONs `pd_works` + `ext_catalog_items` and returns ranked results. An IMSLP ingester edge function clones the `pd-ingest-cpdl` shape and writes to `ext_catalog_items`. New React surface: a `RepertoirePage` with two tabs (Browse / Search), result cards with inline `<audio>` preview, and "Add to My Music" / "Add to Tenant Library" actions that reuse the existing CPDL "Add" flow. Phases 2 (JW Pepper / Sheet Music Plus via CJ Affiliate feed), 3 (assistant tool + save flows), and 4 (band-specific + state prescribed lists) get their own plans.

**Tech Stack:** Postgres 15 + Supabase RLS, Deno edge functions, React 18 + TypeScript, Tailwind + shadcn/ui, TanStack Query, Vitest, Playwright.

## Global Constraints

- Multi-tenant SaaS: writes to tenant-scoped tables MUST set `tenant_id`; NEVER hardcode "Spelman" or any tenant name in copy.
- Light theme only: white cards, dark text, cream page background — use design tokens, no dark-navy cards.
- Studio-size min: text-xs / text-sm and w-4 h-4 icons minimum; never sub-12px.
- "Students" not "singers/members" in marketing/pricing copy; "graduates" not "alumnae/alumni" in code + UI.
- Migrations idempotent (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`).
- New RLS on tenant-scoped tables MUST be RESTRICTIVE + tenant_id-scoped per the multi-tenant memory.
- New external-fetch hosts MUST be added to CSP `connect-src` in `index.html`.
- Node ≥ 20; deploy = local build + `rsync dist/` — NEVER `--delete`.
- Any new plugin call on iOS lives in a follow-up; web-first.

---

## File Structure

**New files (create):**
- `supabase/migrations/20260727120000_ext_catalog_items.sql` — new global external-catalog table, indexes, RLS.
- `supabase/migrations/20260727120100_repertoire_search_rpc.sql` — unified `repertoire_search()` RPC + `repertoire_featured()` RPC.
- `supabase/functions/ext-ingest-imslp/index.ts` — IMSLP MediaWiki API ingester (clone of `pd-ingest-cpdl` shape).
- `src/components/repertoire/RepertoireSearchBar.tsx` — controlled search input + filter chips.
- `src/components/repertoire/RepertoireResultCard.tsx` — result row with title/composer/voicing, audio preview, "Add" menu, "View on source" deep-link.
- `src/components/repertoire/RepertoireBrowseShelf.tsx` — horizontal "Editor's Picks" / "New this week" / "Featured on CPDL" shelves.
- `src/components/repertoire/RepertoireAudioPreview.tsx` — small `<audio>` wrapper that pauses siblings when one plays.
- `src/lib/repertoire/api.ts` — TanStack Query hooks (`useRepertoireSearch`, `useRepertoireFeatured`, `useAddRepertoireToLibrary`).
- `src/lib/repertoire/__tests__/api.test.ts` — Vitest coverage of the query key + params-to-RPC mapping.
- `src/pages/dashboard/RepertoirePage.tsx` — the new `/dashboard/repertoire` page shell (Browse tab, Search tab, filters sidebar).

**Modify:**
- `src/App.tsx` — add `<Route path="/dashboard/repertoire" element={<RepertoirePage />} />` alongside the existing `music-library` route.
- `src/lib/navigation/navCatalog.ts` — insert a `repertoire` entry in the `music` section between `music-library` and `viewer`.
- `index.html` — add `https://imslp.org` and `https://*.imslp.org` to `connect-src` if audio-preview URLs render from IMSLP.

---

## Task 1: `ext_catalog_items` table + RLS

**Files:**
- Create: `supabase/migrations/20260727120000_ext_catalog_items.sql`

**Interfaces:**
- Consumes: nothing (foundation task).
- Produces:
  - Table `ext_catalog_items(id uuid PK, source text, source_id text, title text, composer text, arranger text, voicing text, language text, ensemble_type text, difficulty_grade text, publisher text, editors_choice boolean, editors_choice_note text, list_price_cents int, currency text, source_page_url text, product_url text, affiliate_url text, thumbnail_url text, audio_preview_url text, license_note text, era text, liturgical_use text, season text, ingested_at timestamptz, last_seen_at timestamptz, search_vec tsvector generated)`.
  - Unique key `(source, source_id)`.
  - RLS: SELECT open to `authenticated`; write to super-admin + service-role.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260727120000_ext_catalog_items.sql` with the content shown. It intentionally mirrors `pd_works` (see `supabase/migrations/20260622050000_pd_works_catalog.sql`) so `repertoire_search()` can UNION them without column gymnastics.

```sql
-- ext_catalog_items — External repertoire catalog (IMSLP today; JW Pepper /
-- Sheet Music Plus via CJ Affiliate later). Deliberately shaped like
-- pd_works so a single RPC can UNION both.
--
-- Global (not per-tenant): the same "Holst - First Suite in E-flat" is
-- the same work for every school. Tenant preferences live in follow-up
-- tables (wishlists, saved) — not here.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- gw_unaccent() already exists from 20260622050000_pd_works_catalog.sql

CREATE TABLE IF NOT EXISTS ext_catalog_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'imslp' today; 'jwpepper', 'sheetmusicplus', 'musicspoke' later.
  source                text NOT NULL,
  -- Stable id from the source: IMSLP work page slug; retailer SKU.
  source_id             text NOT NULL,

  title                 text NOT NULL,
  composer              text,
  arranger              text,
  voicing               text,
  language              text,
  -- 'choral' | 'band' | 'orchestra' | 'chamber' | 'solo' | 'mixed'.
  -- Not an enum — sources classify differently and we normalize soft.
  ensemble_type         text,
  -- Free-form grade string as the source labels it ("Grade 3",
  -- "Medium-Difficult", "Level 2"). Normalized at search time.
  difficulty_grade      text,
  publisher             text,

  editors_choice        boolean NOT NULL DEFAULT false,
  editors_choice_note   text,

  list_price_cents      integer,
  currency              text,

  source_page_url       text NOT NULL,
  product_url           text,
  affiliate_url         text,
  thumbnail_url         text,
  audio_preview_url     text,

  license_note          text,
  era                   text,
  liturgical_use        text,
  season                text,

  ingested_at           timestamptz NOT NULL DEFAULT now(),
  last_seen_at          timestamptz NOT NULL DEFAULT now(),

  search_vec            tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(title, ''))),    'A') ||
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(composer, ''))), 'B') ||
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(voicing, ''))),  'C') ||
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(publisher, ''))),'D')
  ) STORED,

  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS ext_catalog_items_search_vec_idx
  ON ext_catalog_items USING GIN (search_vec);
CREATE INDEX IF NOT EXISTS ext_catalog_items_title_trgm_idx
  ON ext_catalog_items USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ext_catalog_items_composer_trgm_idx
  ON ext_catalog_items USING GIN (composer gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ext_catalog_items_ensemble_idx
  ON ext_catalog_items (ensemble_type) WHERE ensemble_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS ext_catalog_items_voicing_idx
  ON ext_catalog_items (voicing) WHERE voicing IS NOT NULL;
CREATE INDEX IF NOT EXISTS ext_catalog_items_editors_choice_idx
  ON ext_catalog_items (editors_choice) WHERE editors_choice = true;
CREATE INDEX IF NOT EXISTS ext_catalog_items_last_seen_idx
  ON ext_catalog_items (last_seen_at);

ALTER TABLE ext_catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ext_catalog_items_read ON ext_catalog_items;
CREATE POLICY ext_catalog_items_read
  ON ext_catalog_items
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS ext_catalog_items_admin_write ON ext_catalog_items;
CREATE POLICY ext_catalog_items_admin_write
  ON ext_catalog_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
        AND p.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
        AND p.is_super_admin = true
    )
  );
```

- [ ] **Step 2: Apply migration locally / to staging**

Kevin runs from his Terminal (no leading `!`):

```bash
cd ~/Documents/GitHub/gleeworld
# via Supabase CLI against the self-hosted stack:
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260727120000_ext_catalog_items.sql
```

Expected: `CREATE TABLE`, several `CREATE INDEX`, `ALTER TABLE`, `CREATE POLICY` echoes; no errors.

- [ ] **Step 3: Smoke-verify the table shape**

```bash
psql "$SUPABASE_DB_URL" -c "\d+ ext_catalog_items" | head -60
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM ext_catalog_items;"
```

Expected: table exists with all columns above; count = 0.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260727120000_ext_catalog_items.sql
git commit -m "feat(repertoire): add ext_catalog_items table for external repertoire sources"
```

---

## Task 2: Unified `repertoire_search()` + `repertoire_featured()` RPCs

**Files:**
- Create: `supabase/migrations/20260727120100_repertoire_search_rpc.sql`

**Interfaces:**
- Consumes: `pd_works`, `ext_catalog_items`, `gw_unaccent`.
- Produces:
  - `repertoire_search(p_query text, p_ensemble text, p_voicing text, p_language text, p_composer text, p_source text, p_limit int, p_offset int) RETURNS TABLE (id uuid, source text, source_id text, title text, composer text, voicing text, language text, ensemble_type text, publisher text, editors_choice boolean, list_price_cents int, currency text, source_page_url text, product_url text, affiliate_url text, thumbnail_url text, audio_preview_url text, attribution text, has_cached_pdf boolean, rank real)`.
  - `repertoire_featured(p_ensemble text, p_limit int) RETURNS TABLE (...)` — same columns, returns editor's-choice-or-recently-ingested items.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260727120100_repertoire_search_rpc.sql`:

```sql
-- Unified search RPC across pd_works (CPDL/free) + ext_catalog_items
-- (IMSLP now; JWP/SMP later). Callers get one ranked result set.

CREATE OR REPLACE FUNCTION repertoire_search(
  p_query      text DEFAULT NULL,
  p_ensemble   text DEFAULT NULL,   -- 'choral' | 'band' | 'orchestra' | ...
  p_voicing    text DEFAULT NULL,
  p_language   text DEFAULT NULL,
  p_composer   text DEFAULT NULL,
  p_source     text DEFAULT NULL,   -- 'cpdl' | 'imslp' | 'jwpepper' | ...
  p_limit      int  DEFAULT 50,
  p_offset     int  DEFAULT 0
)
RETURNS TABLE (
  id                 uuid,
  source             text,
  source_id          text,
  title              text,
  composer           text,
  voicing            text,
  language           text,
  ensemble_type      text,
  publisher          text,
  editors_choice     boolean,
  list_price_cents   int,
  currency           text,
  source_page_url    text,
  product_url        text,
  affiliate_url      text,
  thumbnail_url      text,
  audio_preview_url  text,
  attribution        text,
  has_cached_pdf     boolean,
  rank               real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH q AS (
    SELECT
      CASE
        WHEN p_query IS NULL OR length(trim(p_query)) = 0 THEN NULL
        ELSE plainto_tsquery('simple', public.gw_unaccent(p_query))
      END AS ts
  ),
  pd AS (
    SELECT
      w.id,
      w.source,
      w.source_id,
      w.title,
      w.composer,
      w.voicing,
      w.language,
      'choral'::text        AS ensemble_type,    -- CPDL is choral by definition
      NULL::text            AS publisher,
      false                 AS editors_choice,
      NULL::int             AS list_price_cents,
      NULL::text            AS currency,
      w.source_page_url,
      NULL::text            AS product_url,
      NULL::text            AS affiliate_url,
      NULL::text            AS thumbnail_url,
      NULL::text            AS audio_preview_url,
      w.attribution,
      (w.storage_key IS NOT NULL) AS has_cached_pdf,
      CASE
        WHEN (SELECT ts FROM q) IS NOT NULL
          THEN ts_rank(w.search_vec, (SELECT ts FROM q))
        ELSE 0
      END AS rank
    FROM pd_works w
    WHERE
      (
        (SELECT ts FROM q) IS NULL
        OR w.search_vec @@ (SELECT ts FROM q)
        OR (p_query IS NOT NULL AND w.title ILIKE '%' || p_query || '%')
      )
      AND (p_voicing  IS NULL OR w.voicing  ILIKE p_voicing  || '%')
      AND (p_language IS NULL OR w.language ILIKE p_language || '%')
      AND (p_composer IS NULL OR w.composer ILIKE '%' || p_composer || '%')
      AND (p_source   IS NULL OR w.source   = p_source)
      AND (p_ensemble IS NULL OR p_ensemble = 'choral')
  ),
  ext AS (
    SELECT
      e.id,
      e.source,
      e.source_id,
      e.title,
      e.composer,
      e.voicing,
      e.language,
      e.ensemble_type,
      e.publisher,
      e.editors_choice,
      e.list_price_cents,
      e.currency,
      e.source_page_url,
      e.product_url,
      e.affiliate_url,
      e.thumbnail_url,
      e.audio_preview_url,
      NULL::text          AS attribution,
      false               AS has_cached_pdf,
      CASE
        WHEN (SELECT ts FROM q) IS NOT NULL
          THEN ts_rank(e.search_vec, (SELECT ts FROM q))
             + CASE WHEN e.editors_choice THEN 0.05 ELSE 0 END
        ELSE CASE WHEN e.editors_choice THEN 0.05 ELSE 0 END
      END AS rank
    FROM ext_catalog_items e
    WHERE
      (
        (SELECT ts FROM q) IS NULL
        OR e.search_vec @@ (SELECT ts FROM q)
        OR (p_query IS NOT NULL AND e.title ILIKE '%' || p_query || '%')
      )
      AND (p_voicing  IS NULL OR e.voicing  ILIKE p_voicing  || '%')
      AND (p_language IS NULL OR e.language ILIKE p_language || '%')
      AND (p_composer IS NULL OR e.composer ILIKE '%' || p_composer || '%')
      AND (p_source   IS NULL OR e.source   = p_source)
      AND (p_ensemble IS NULL OR e.ensemble_type = p_ensemble)
  )
  SELECT * FROM pd
  UNION ALL
  SELECT * FROM ext
  ORDER BY rank DESC, title ASC
  LIMIT GREATEST(1, LEAST(p_limit, 200))
  OFFSET GREATEST(0, p_offset);
$$;

GRANT EXECUTE ON FUNCTION repertoire_search(text, text, text, text, text, text, int, int)
  TO authenticated;

-- Featured / editor's-choice shelf. Non-search endpoint used by the
-- Browse tab. Returns editors_choice=true first, then recently ingested.
CREATE OR REPLACE FUNCTION repertoire_featured(
  p_ensemble text DEFAULT NULL,
  p_limit    int  DEFAULT 24
)
RETURNS TABLE (
  id                 uuid,
  source             text,
  source_id          text,
  title              text,
  composer           text,
  voicing            text,
  language           text,
  ensemble_type      text,
  publisher          text,
  editors_choice     boolean,
  list_price_cents   int,
  currency           text,
  source_page_url    text,
  product_url        text,
  affiliate_url      text,
  thumbnail_url      text,
  audio_preview_url  text,
  attribution        text,
  has_cached_pdf     boolean,
  rank               real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.id, e.source, e.source_id, e.title, e.composer, e.voicing,
    e.language, e.ensemble_type, e.publisher, e.editors_choice,
    e.list_price_cents, e.currency, e.source_page_url, e.product_url,
    e.affiliate_url, e.thumbnail_url, e.audio_preview_url,
    NULL::text AS attribution,
    false AS has_cached_pdf,
    (CASE WHEN e.editors_choice THEN 1.0 ELSE 0 END
      + (extract(epoch FROM e.ingested_at) / 1e10))::real AS rank
  FROM ext_catalog_items e
  WHERE (p_ensemble IS NULL OR e.ensemble_type = p_ensemble)
  ORDER BY rank DESC, e.title ASC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$$;

GRANT EXECUTE ON FUNCTION repertoire_featured(text, int) TO authenticated;
```

- [ ] **Step 2: Apply + smoke-test with empty tables**

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260727120100_repertoire_search_rpc.sql
psql "$SUPABASE_DB_URL" -c "SELECT * FROM repertoire_search('mozart', NULL, NULL, NULL, NULL, NULL, 10, 0);" | head -20
psql "$SUPABASE_DB_URL" -c "SELECT * FROM repertoire_featured(NULL, 10);"
```

Expected: `repertoire_search` returns CPDL Mozart rows (since `pd_works` already has ~57k works). `repertoire_featured` returns empty until IMSLP ingest runs. No errors.

- [ ] **Step 3: Seed 2 fake ext_catalog_items rows to verify UNION**

```bash
psql "$SUPABASE_DB_URL" <<'SQL'
INSERT INTO ext_catalog_items
  (source, source_id, title, composer, voicing, ensemble_type, editors_choice, source_page_url)
VALUES
  ('imslp', 'test-fixture-1', 'Test Mozart Requiem', 'Wolfgang Amadeus Mozart', 'SATB', 'choral', true,  'https://imslp.org/test-1'),
  ('imslp', 'test-fixture-2', 'Test Mozart Overture', 'Wolfgang Amadeus Mozart', NULL, 'band', false, 'https://imslp.org/test-2')
ON CONFLICT (source, source_id) DO NOTHING;
SQL
psql "$SUPABASE_DB_URL" -c "SELECT source, title, ensemble_type FROM repertoire_search('mozart', NULL, NULL, NULL, NULL, NULL, 5, 0);"
psql "$SUPABASE_DB_URL" -c "SELECT source, title, editors_choice FROM repertoire_featured('choral', 5);"
```

Expected: search results include BOTH CPDL Mozart rows AND the two fixtures; featured returns the choral fixture with editors_choice=true first. Delete the fixtures after:

```bash
psql "$SUPABASE_DB_URL" -c "DELETE FROM ext_catalog_items WHERE source_id LIKE 'test-fixture-%';"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260727120100_repertoire_search_rpc.sql
git commit -m "feat(repertoire): add repertoire_search + repertoire_featured RPCs (UNION pd_works + ext_catalog_items)"
```

---

## Task 3: IMSLP ingester edge function

**Files:**
- Create: `supabase/functions/ext-ingest-imslp/index.ts`

**Interfaces:**
- Consumes: `ext_catalog_items` write via service-role.
- Produces:
  - POST endpoint. Body: `{ "mode": "category" | "search" | "allpages", "category"?: string, "query"?: string, "max_pages"?: number, "delay_ms"?: number, "continue_token"?: string }`.
  - Response: `{ ok: true, processed: number, upserted: number, next_continue: string | null }`.
  - Upserts into `ext_catalog_items` on `(source, source_id)` with `source = 'imslp'`, `source_id = imslp_page_slug`.

- [ ] **Step 1: Read the CPDL ingester as reference**

Read `supabase/functions/pd-ingest-cpdl/index.ts` end-to-end. The IMSLP function mirrors its shape: MediaWiki API discovery + per-page metadata resolution + upsert + rate-limit etiquette. Diffs to note:
  - IMSLP host: `https://imslp.org/api.php` (no test-subdomain switch — main works from datacenter IPs with a UA).
  - IMSLP page_id → `source_id` (stable). Page title → `title`. Composer parsed from `Category:Composers` link on the page. Ensemble type inferred from the "For X" categories on each work page (e.g. "Category:For unaccompanied chorus" → `choral`; "Category:For band" → `band`).
  - No PDF caching in Phase 1 — IMSLP scores are ISMLP-hosted; product_url = the IMSLP work page.
  - Audio previews: IMSLP occasionally hosts `.mp3`/`.ogg` synth renderings — grab the first `File:*.mp3` on the work page if present into `audio_preview_url`.

- [ ] **Step 2: Write the function**

Create `supabase/functions/ext-ingest-imslp/index.ts`:

```typescript
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
```

- [ ] **Step 3: Deploy the edge function**

Per the "Edge fn deploy" memory: functions live at `/opt/supabase/volumes/functions/` on the droplet. Deno needs `.ts` on relative imports (this fn has none — safe).

```bash
scp -r supabase/functions/ext-ingest-imslp \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "docker restart supabase-edge-functions-supabase"
```

- [ ] **Step 4: Kick off a tiny test crawl**

```bash
curl -X POST "https://supabase.gleeworld.org/functions/v1/ext-ingest-imslp" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "content-type: application/json" \
  -d '{"mode":"category","category":"Category:For unaccompanied chorus","max_pages":5,"delay_ms":1200}'
```

Expected: `{ "ok": true, "processed": 5, "upserted": >=1, "next_continue": "<some string or null>" }`.

Then verify:

```bash
psql "$SUPABASE_DB_URL" -c "SELECT source, source_id, title, composer, ensemble_type, audio_preview_url IS NOT NULL AS has_audio FROM ext_catalog_items WHERE source='imslp' LIMIT 5;"
```

Expected: 5 rows with title/composer populated, ensemble_type='choral' for most.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/ext-ingest-imslp/index.ts
git commit -m "feat(repertoire): add IMSLP ingester edge function (ext-ingest-imslp)"
```

---

## Task 4: TanStack Query hooks (`useRepertoireSearch`, `useRepertoireFeatured`)

**Files:**
- Create: `src/lib/repertoire/api.ts`
- Create: `src/lib/repertoire/__tests__/api.test.ts`

**Interfaces:**
- Consumes: `repertoire_search`, `repertoire_featured` RPCs; `supabase` client from `src/integrations/supabase/client`.
- Produces:
  - `type RepertoireItem` — the row shape returned by the RPC.
  - `useRepertoireSearch(params: RepertoireSearchParams): UseQueryResult<RepertoireItem[]>` — keyed on all params.
  - `useRepertoireFeatured(ensemble?: string, limit?: number): UseQueryResult<RepertoireItem[]>`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/repertoire/__tests__/api.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { repertoireSearchQueryKey, repertoireFeaturedQueryKey } from '../api';

describe('repertoire query keys', () => {
  it('search key encodes every param so different filters miss cache', () => {
    const a = repertoireSearchQueryKey({ query: 'mozart', ensemble: 'choral' });
    const b = repertoireSearchQueryKey({ query: 'mozart', ensemble: 'band' });
    expect(a).not.toEqual(b);
  });

  it('search key is stable for identical params', () => {
    const a = repertoireSearchQueryKey({ query: 'mozart', ensemble: 'choral' });
    const b = repertoireSearchQueryKey({ query: 'mozart', ensemble: 'choral' });
    expect(a).toEqual(b);
  });

  it('featured key includes ensemble', () => {
    expect(repertoireFeaturedQueryKey('choral', 24)).not.toEqual(
      repertoireFeaturedQueryKey('band', 24)
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/Documents/GitHub/gleeworld
npx vitest run src/lib/repertoire/__tests__/api.test.ts
```

Expected: FAIL — cannot resolve `../api`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/repertoire/api.ts`:

```typescript
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RepertoireItem {
  id: string;
  source: string;
  source_id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  language: string | null;
  ensemble_type: string | null;
  publisher: string | null;
  editors_choice: boolean;
  list_price_cents: number | null;
  currency: string | null;
  source_page_url: string;
  product_url: string | null;
  affiliate_url: string | null;
  thumbnail_url: string | null;
  audio_preview_url: string | null;
  attribution: string | null;
  has_cached_pdf: boolean;
  rank: number;
}

export interface RepertoireSearchParams {
  query?: string;
  ensemble?: string;
  voicing?: string;
  language?: string;
  composer?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export function repertoireSearchQueryKey(params: RepertoireSearchParams): unknown[] {
  return [
    'repertoire-search',
    params.query ?? '',
    params.ensemble ?? '',
    params.voicing ?? '',
    params.language ?? '',
    params.composer ?? '',
    params.source ?? '',
    params.limit ?? 50,
    params.offset ?? 0,
  ];
}

export function repertoireFeaturedQueryKey(ensemble?: string, limit = 24): unknown[] {
  return ['repertoire-featured', ensemble ?? '', limit];
}

export function useRepertoireSearch(
  params: RepertoireSearchParams,
  opts?: { enabled?: boolean }
): UseQueryResult<RepertoireItem[]> {
  return useQuery({
    queryKey: repertoireSearchQueryKey(params),
    enabled: opts?.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('repertoire_search', {
        p_query: params.query || null,
        p_ensemble: params.ensemble || null,
        p_voicing: params.voicing || null,
        p_language: params.language || null,
        p_composer: params.composer || null,
        p_source: params.source || null,
        p_limit: params.limit ?? 50,
        p_offset: params.offset ?? 0,
      });
      if (error) throw error;
      return (data ?? []) as RepertoireItem[];
    },
  });
}

export function useRepertoireFeatured(
  ensemble?: string,
  limit = 24
): UseQueryResult<RepertoireItem[]> {
  return useQuery({
    queryKey: repertoireFeaturedQueryKey(ensemble, limit),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('repertoire_featured', {
        p_ensemble: ensemble || null,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as RepertoireItem[];
    },
  });
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run src/lib/repertoire/__tests__/api.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/repertoire/api.ts src/lib/repertoire/__tests__/api.test.ts
git commit -m "feat(repertoire): add TanStack Query hooks for repertoire search + featured"
```

---

## Task 5: Result card + audio preview + shelf components

**Files:**
- Create: `src/components/repertoire/RepertoireAudioPreview.tsx`
- Create: `src/components/repertoire/RepertoireResultCard.tsx`
- Create: `src/components/repertoire/RepertoireBrowseShelf.tsx`
- Create: `src/components/repertoire/RepertoireSearchBar.tsx`

**Interfaces:**
- Consumes: `RepertoireItem` from `src/lib/repertoire/api.ts`.
- Produces: 4 pure React components; parent (RepertoirePage) wires actions.

- [ ] **Step 1: Write `RepertoireAudioPreview`**

Create `src/components/repertoire/RepertoireAudioPreview.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Broadcast channel so only one preview plays at a time across the page.
const PREVIEW_EVENT = 'gw-repertoire-preview-play';

interface Props {
  url: string;
  ownerId: string; // dedupe key so a card can ignore its own broadcast
}

export function RepertoireAudioPreview({ url, ownerId }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const onOtherPlay = (e: Event) => {
      const detail = (e as CustomEvent<{ ownerId: string }>).detail;
      if (detail.ownerId !== ownerId && audioRef.current) {
        audioRef.current.pause();
        setPlaying(false);
      }
    };
    window.addEventListener(PREVIEW_EVENT, onOtherPlay);
    return () => window.removeEventListener(PREVIEW_EVENT, onOtherPlay);
  }, [ownerId]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: { ownerId } }));
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost" onClick={toggle} aria-label={playing ? 'Pause preview' : 'Play preview'}>
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
      <span className="text-xs text-muted-foreground">Preview</span>
    </div>
  );
}
```

- [ ] **Step 2: Write `RepertoireResultCard`**

Create `src/components/repertoire/RepertoireResultCard.tsx`:

```typescript
import { ExternalLink, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { RepertoireItem } from '@/lib/repertoire/api';
import { RepertoireAudioPreview } from './RepertoireAudioPreview';

interface Props {
  item: RepertoireItem;
  onAddToMyMusic?: (item: RepertoireItem) => void;
  onAddToTenant?: (item: RepertoireItem) => void;
}

export function RepertoireResultCard({ item, onAddToMyMusic, onAddToTenant }: Props) {
  const sourceLabel =
    item.source === 'cpdl' ? 'CPDL' :
    item.source === 'imslp' ? 'IMSLP' :
    item.source;

  return (
    <Card className="bg-card">
      <CardContent className="p-4 flex gap-4">
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-16 h-20 object-cover rounded border"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-20 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
            {sourceLabel}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-medium text-sm truncate">{item.title}</h3>
              {item.composer && (
                <p className="text-xs text-muted-foreground truncate">{item.composer}</p>
              )}
            </div>
            {item.editors_choice && (
              <Badge variant="secondary" className="text-xs shrink-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Editor's Pick
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {item.voicing && <Badge variant="outline" className="text-xs">{item.voicing}</Badge>}
            {item.ensemble_type && <Badge variant="outline" className="text-xs">{item.ensemble_type}</Badge>}
            {item.language && <Badge variant="outline" className="text-xs">{item.language}</Badge>}
            {item.publisher && <Badge variant="outline" className="text-xs">{item.publisher}</Badge>}
            <Badge variant="outline" className="text-xs">{sourceLabel}</Badge>
          </div>

          <div className="flex items-center justify-between gap-2 mt-3">
            {item.audio_preview_url ? (
              <RepertoireAudioPreview url={item.audio_preview_url} ownerId={item.id} />
            ) : (
              <span className="text-xs text-muted-foreground">No audio preview</span>
            )}

            <div className="flex items-center gap-1">
              {onAddToMyMusic && (
                <Button size="sm" variant="outline" onClick={() => onAddToMyMusic(item)}>
                  Add to My Music
                </Button>
              )}
              {onAddToTenant && (
                <Button size="sm" onClick={() => onAddToTenant(item)}>
                  Add to Library
                </Button>
              )}
              <a
                href={item.affiliate_url || item.product_url || item.source_page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline ml-1"
              >
                Source <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {item.attribution && (
            <p className="text-[10px] text-muted-foreground mt-2 truncate">{item.attribution}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Write `RepertoireBrowseShelf`**

Create `src/components/repertoire/RepertoireBrowseShelf.tsx`:

```typescript
import type { RepertoireItem } from '@/lib/repertoire/api';
import { RepertoireResultCard } from './RepertoireResultCard';

interface Props {
  title: string;
  items: RepertoireItem[];
  loading?: boolean;
  onAddToMyMusic?: (item: RepertoireItem) => void;
  onAddToTenant?: (item: RepertoireItem) => void;
}

export function RepertoireBrowseShelf({ title, items, loading, onAddToMyMusic, onAddToTenant }: Props) {
  if (!loading && items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="h-24 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((it) => (
            <RepertoireResultCard
              key={it.id}
              item={it}
              onAddToMyMusic={onAddToMyMusic}
              onAddToTenant={onAddToTenant}
            />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Write `RepertoireSearchBar`**

Create `src/components/repertoire/RepertoireSearchBar.tsx`:

```typescript
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface RepertoireFilters {
  query: string;
  ensemble: string; // '' | 'choral' | 'band' | 'orchestra' | 'chamber' | 'solo'
  voicing: string;  // '' | 'SATB' | 'SSA' | 'TTBB' | ...
  source: string;   // '' | 'cpdl' | 'imslp' | ...
}

interface Props {
  filters: RepertoireFilters;
  onChange: (next: RepertoireFilters) => void;
}

export function RepertoireSearchBar({ filters, onChange }: Props) {
  const set = <K extends keyof RepertoireFilters>(k: K, v: RepertoireFilters[K]) =>
    onChange({ ...filters, [k]: v });

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search titles, composers, publishers"
          value={filters.query}
          onChange={(e) => set('query', e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.ensemble || 'any'} onValueChange={(v) => set('ensemble', v === 'any' ? '' : v)}>
        <SelectTrigger className="md:w-40 text-xs"><SelectValue placeholder="Ensemble" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any ensemble</SelectItem>
          <SelectItem value="choral">Choral</SelectItem>
          <SelectItem value="band">Band</SelectItem>
          <SelectItem value="orchestra">Orchestra</SelectItem>
          <SelectItem value="chamber">Chamber</SelectItem>
          <SelectItem value="solo">Solo</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.voicing || 'any'} onValueChange={(v) => set('voicing', v === 'any' ? '' : v)}>
        <SelectTrigger className="md:w-32 text-xs"><SelectValue placeholder="Voicing" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any voicing</SelectItem>
          <SelectItem value="SATB">SATB</SelectItem>
          <SelectItem value="SSA">SSA</SelectItem>
          <SelectItem value="SSAA">SSAA</SelectItem>
          <SelectItem value="TTBB">TTBB</SelectItem>
          <SelectItem value="TB">TB</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.source || 'any'} onValueChange={(v) => set('source', v === 'any' ? '' : v)}>
        <SelectTrigger className="md:w-32 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="any">All sources</SelectItem>
          <SelectItem value="cpdl">CPDL</SelectItem>
          <SelectItem value="imslp">IMSLP</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/repertoire/
git commit -m "feat(repertoire): add result card, audio preview, browse shelf, search bar components"
```

---

## Task 6: `RepertoirePage` + route + nav entry

**Files:**
- Create: `src/pages/dashboard/RepertoirePage.tsx`
- Modify: `src/App.tsx` (add route)
- Modify: `src/lib/navigation/navCatalog.ts` (add nav entry)

**Interfaces:**
- Consumes: hooks from `src/lib/repertoire/api.ts`; components from `src/components/repertoire/`.
- Produces: A page at `/dashboard/repertoire` with two tabs (Browse / Search).

- [ ] **Step 1: Write `RepertoirePage`**

Create `src/pages/dashboard/RepertoirePage.tsx`:

```typescript
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import DashboardPageShell from '@/components/layouts/DashboardPageShell';
import {
  useRepertoireSearch,
  useRepertoireFeatured,
  type RepertoireItem,
} from '@/lib/repertoire/api';
import {
  RepertoireSearchBar,
  type RepertoireFilters,
} from '@/components/repertoire/RepertoireSearchBar';
import { RepertoireResultCard } from '@/components/repertoire/RepertoireResultCard';
import { RepertoireBrowseShelf } from '@/components/repertoire/RepertoireBrowseShelf';

const DEFAULTS: RepertoireFilters = { query: '', ensemble: '', voicing: '', source: '' };

export default function RepertoirePage() {
  const [filters, setFilters] = useState<RepertoireFilters>(DEFAULTS);
  const [tab, setTab] = useState<'browse' | 'search'>('browse');

  const featuredChoral = useRepertoireFeatured('choral', 12);
  const featuredBand   = useRepertoireFeatured('band', 12);

  const searchEnabled = tab === 'search' && (filters.query.trim().length > 0
    || filters.ensemble || filters.voicing || filters.source);

  const search = useRepertoireSearch(
    {
      query: filters.query || undefined,
      ensemble: filters.ensemble || undefined,
      voicing: filters.voicing || undefined,
      source: filters.source || undefined,
      limit: 50,
    },
    { enabled: searchEnabled }
  );

  // Phase 1: Add-to-library actions are placeholders that toast.
  // Phase 3 wires them to gw_personal_scores / gw_sheet_music.
  const onAddToMyMusic = (item: RepertoireItem) =>
    toast.info(`"${item.title}" — saving to My Music (coming in Phase 3)`);
  const onAddToTenant = (item: RepertoireItem) =>
    toast.info(`"${item.title}" — saving to tenant library (coming in Phase 3)`);

  return (
    <DashboardPageShell title="Repertoire" subtitle="Browse and search choral & band repertoire across CPDL, IMSLP and more">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'browse' | 'search')}>
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6 mt-4">
          <RepertoireBrowseShelf
            title="Featured choral"
            items={featuredChoral.data ?? []}
            loading={featuredChoral.isLoading}
            onAddToMyMusic={onAddToMyMusic}
            onAddToTenant={onAddToTenant}
          />
          <RepertoireBrowseShelf
            title="Featured band"
            items={featuredBand.data ?? []}
            loading={featuredBand.isLoading}
            onAddToMyMusic={onAddToMyMusic}
            onAddToTenant={onAddToTenant}
          />
          {!featuredChoral.isLoading && !featuredBand.isLoading &&
            (featuredChoral.data ?? []).length === 0 &&
            (featuredBand.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Featured selections will appear once the IMSLP crawler has ingested content. Try the Search tab in the meantime — CPDL's full catalog is already available.
              </p>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4 mt-4">
          <RepertoireSearchBar filters={filters} onChange={setFilters} />
          {!searchEnabled && (
            <p className="text-sm text-muted-foreground">Enter a search term or pick a filter to see results.</p>
          )}
          {searchEnabled && search.isLoading && (
            <p className="text-sm text-muted-foreground">Searching…</p>
          )}
          {searchEnabled && search.data && search.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No results. Try broadening the search.</p>
          )}
          {searchEnabled && search.data && search.data.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {search.data.map((it) => (
                <RepertoireResultCard
                  key={it.id}
                  item={it}
                  onAddToMyMusic={onAddToMyMusic}
                  onAddToTenant={onAddToTenant}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardPageShell>
  );
}
```

- [ ] **Step 2: Register the route in `src/App.tsx`**

Find the existing `music-library` route (grep for `path="/dashboard/music-library"`; there's a match near line 1413) and add a sibling route directly after it:

```tsx
<Route
  path="/dashboard/repertoire"
  element={<RepertoirePage />}
/>
```

Import at the top of the file next to the other page imports:

```tsx
import RepertoirePage from '@/pages/dashboard/RepertoirePage';
```

- [ ] **Step 3: Add nav entry in `src/lib/navigation/navCatalog.ts`**

At `src/lib/navigation/navCatalog.ts:60`, immediately after the `music-library` line, add:

```typescript
  { key: 'repertoire',    to: '/dashboard/repertoire',    label: 'Repertoire',    icon: BookOpen, section: 'music', tone: 'bg-sky-50 text-sky-700',       tourId: 'nav-repertoire' },
```

Add `BookOpen` to the `lucide-react` import at the top of the file if not already present.

- [ ] **Step 4: Run typecheck + unit tests**

```bash
cd ~/Documents/GitHub/gleeworld
npx tsc --noEmit
npx vitest run
```

Expected: PASS. Fix any TS errors before proceeding.

- [ ] **Step 5: Verify in-browser using the `verify` skill**

Invoke `verify` skill to boot the local dev server and drive Playwright at 390px + desktop:

1. Sign in as a demo user (see `reference_gleeworld_e2e_harness` — `demo@` works).
2. Navigate to `/dashboard/repertoire`. Confirm both tabs render, sidebar item highlights, layout is light-theme (no dark-navy cards).
3. Browse tab: featured shelves show (or the "will appear once IMSLP crawler…" message).
4. Search tab: type "Mozart" → CPDL results stream in. Verify audio preview button appears on any IMSLP fixture row (may need to seed a fixture with `audio_preview_url` for the QA pass).
5. Click "Source" on a CPDL row → opens `cpdl.org` in a new tab. Attribution text visible.
6. Mobile 390px: search bar wraps, cards single-column, no horizontal scroll.

Expected: all six pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/dashboard/RepertoirePage.tsx src/App.tsx src/lib/navigation/navCatalog.ts
git commit -m "feat(repertoire): add /dashboard/repertoire page with Browse + Search tabs and nav entry"
```

---

## Task 7: Deploy Phase 1 to production

**Files:**
- No new files; deploy artifacts only.

**Interfaces:**
- Consumes: everything from Tasks 1–6, committed to the working branch.

- [ ] **Step 1: Local production build**

```bash
cd ~/Documents/GitHub/gleeworld
npm ci
npm run build
```

Expected: `dist/` produced, no build errors.

- [ ] **Step 2: rsync dist/ to droplet (NEVER --delete)**

Per the memory `feedback_gleeworld_deploy_rsync`:

```bash
rsync -av dist/ root@gleeworld.org:/var/www/gleeworld/dist/
```

- [ ] **Step 3: Apply the two migrations on prod**

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260727120000_ext_catalog_items.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260727120100_repertoire_search_rpc.sql
```

- [ ] **Step 4: Ship + smoke-run the IMSLP ingester**

```bash
scp -r supabase/functions/ext-ingest-imslp \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "docker restart supabase-edge-functions-supabase"

# Kick off a real crawl of the choral category (~50 works):
curl -X POST "https://supabase.gleeworld.org/functions/v1/ext-ingest-imslp" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "content-type: application/json" \
  -d '{"mode":"category","category":"Category:For unaccompanied chorus","max_pages":50,"delay_ms":1200}'
```

Expected: `{ ok: true, processed: 50, upserted: >=40, next_continue: "..." }`.

- [ ] **Step 5: Live md5-verify the deployed page**

Confirm the new page bundle actually shipped (per `stale-build-landing-regression` memory — always md5-verify after a deploy):

```bash
LOCAL=$(md5 -q dist/index.html)
REMOTE=$(curl -s https://gleeworld.org/index.html | md5)
echo "local:  $LOCAL"
echo "remote: $REMOTE"
[ "$LOCAL" = "$REMOTE" ] && echo "OK: deploy matches" || echo "MISMATCH — investigate"
```

- [ ] **Step 6: Human QA**

Ask Kevin to:
- Sign in on desktop and mobile, hit **Repertoire** in the sidebar.
- Confirm Browse shelves render (may be sparse until crawler finishes).
- Search "Mozart" and "Holst", confirm CPDL + IMSLP rows interleave with source badges.
- Click Play on any IMSLP row with `audio_preview_url` → hear audio; only one preview plays at a time.
- Confirm sidebar Music section shows Repertoire between Music Library and Viewer.

- [ ] **Step 7: Commit any last touch-ups + push**

```bash
git status
git push origin <branch>
gh pr create --title "Repertoire search Phase 1: CPDL + IMSLP unified browse/search" --body "$(cat <<'EOF'
## Summary
- Global `ext_catalog_items` table + unified `repertoire_search()` / `repertoire_featured()` RPCs (UNION with `pd_works`).
- IMSLP ingester edge function (`ext-ingest-imslp`) — clone of CPDL ingester pattern.
- `/dashboard/repertoire` page with Browse (editor's picks shelves) and Search tabs, audio previews, source-attribution links.

Phases 2 (JW Pepper / Sheet Music Plus via CJ Affiliate), 3 (assistant tool + save-to-library flows), 4 (band + state prescribed music lists) get their own plans.

## Test plan
- [ ] Migrations applied clean on prod.
- [ ] IMSLP crawler processed ≥50 pages on first run.
- [ ] Browse tab shows featured shelves for choral & band.
- [ ] Search returns CPDL + IMSLP results interleaved with source badges.
- [ ] Audio preview button plays; only one preview at a time.
- [ ] Sidebar nav shows Repertoire in Music section.
- [ ] 390px mobile layout: no horizontal scroll, cards stack.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Follow-ups (out of scope for Phase 1)

- **Phase 2:** JW Pepper + Sheet Music Plus via CJ Affiliate product feeds. New `ext-ingest-cj` edge fn; adds `affiliate_url` and `list_price_cents` to real rows. Requires CJ Publisher account signup.
- **Phase 3:** Assistant tool `search_repertoire` that returns the same shape; real "Add to My Music" / "Add to Library" that writes `gw_personal_scores` and `gw_sheet_music` and (for CPDL/IMSLP rows) triggers PDF caching to DO Spaces.
- **Phase 4:** Windrep.org (band) + state prescribed music lists (TMEA/UIL/FBA/NYSSMA). Per-state one-off ingest, yearly refresh.
- **Deferred niceties:** cursor-based pagination on the search results grid; per-user "saved for later" wishlist; ensemble-type inference from CPDL voicing when we later re-ingest.
