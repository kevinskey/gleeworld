-- Public-Domain Works Catalog (pd_works) — CP1 of the CPDL feature.
--
-- IMPORTANT ARCHITECTURE RULE:
--   The CPDL Action API is called ONLY by the ingestion job that
--   upserts into THIS table. End-user search hits this table, never
--   CPDL live. That keeps user-facing latency low, CPDL's load low,
--   and our compliance with their API etiquette obvious.
--
-- Scope: GLOBAL (platform-wide), not per-tenant. A single ingested
-- "Sanctus" from a CPDL editor is visible to every tenant. RLS:
--   - SELECT: open to authenticated users (read-only catalog).
--   - INSERT/UPDATE/DELETE: restricted to platform super-admins +
--     the service role used by the cron ingester.
--
-- Designed to accept additional sources (IMSLP, etc.) without schema
-- changes via the `source` column and the `(source, source_id)` UNIQUE
-- key. Anything CPDL-specific lives in the ingestion job, not here.

-- 1) Extensions ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Postgres refuses to use unaccent() in STORED generated columns because
-- the bare function is volatile (the dictionary it loads could change).
-- This thin wrapper marks the call IMMUTABLE so it can participate in
-- generated columns — the standard community workaround. We pass the
-- explicit dictionary name so behavior doesn't drift if a future setting
-- changes the default.
CREATE OR REPLACE FUNCTION public.gw_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$;

-- 2) Enum: license_type -------------------------------------------------
-- DO NOT flatten 'cpdl_license' into 'public_domain' in display code.
-- The work may be PD globally but the EDITION (engraving) carries a
-- separate CPDL-specific share-alike-style license requiring attribution.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gw_pd_license_type') THEN
    CREATE TYPE gw_pd_license_type AS ENUM (
      'public_domain',
      'cpdl_license'
    );
  END IF;
END $$;

-- 3) pd_works table -----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_works (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'cpdl' today; 'imslp' or others later. The user-search path
  -- doesn't care about the source — filters are content fields below.
  source              text NOT NULL,
  -- Stable id from the source (CPDL: the wiki page title in
  -- canonical form, e.g. "Ave_Maria_(Franz_Biebl)"; IMSLP: their
  -- catalog id). Combined with source = idempotent upsert key.
  source_id           text NOT NULL,
  title               text NOT NULL,
  composer            text,
  -- Free-form voicing string as CPDL labels it ("SATB", "TTBB",
  -- "SSAATTBB div", "SATB + organ"). We normalize at search time.
  voicing             text,
  language            text,
  -- Canonical URL of the source page for "View on CPDL" links.
  source_page_url     text NOT NULL,
  -- Direct URL to the score asset on the source (the File: image-info
  -- URL on CPDL, or an external publisher link the wiki points to).
  -- Nullable because some CPDL pages link to multiple editions or
  -- to external PDFs that need separate resolution.
  original_score_url  text,
  -- Path inside the DigitalOcean Spaces `pd-cache` bucket once we've
  -- fetched and cached the PDF. Pattern: pd/{source}/{source_id}.pdf.
  -- Cached ONCE platform-wide on first "Add to library" click; every
  -- tenant after that reuses the cached object.
  storage_key         text,
  license_type        gw_pd_license_type NOT NULL,
  -- Required attribution string to display whenever the work is shown
  -- (editor name + page URL for CPDL, per their license). NEVER omit
  -- this in UI — that violates the source license.
  attribution         text,
  -- Optional content metadata the ingester may pull for richer search.
  era                 text,
  liturgical_use      text,
  -- Catalog hygiene timestamps. last_seen_at is bumped each crawl;
  -- a long gap means the source page was removed or renamed.
  ingested_at         timestamptz NOT NULL DEFAULT now(),
  last_seen_at        timestamptz NOT NULL DEFAULT now(),
  -- Materialized FTS vector for fast title/composer search. Generated
  -- column = always in sync with the source columns, no triggers.
  search_vec          tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(title, ''))),    'A') ||
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(composer, ''))), 'B') ||
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(voicing, ''))),  'C')
  ) STORED,
  UNIQUE (source, source_id)
);

-- 4) Indexes ------------------------------------------------------------
-- FTS for the primary search experience (ranked by weight A>B>C above).
CREATE INDEX IF NOT EXISTS pd_works_search_vec_idx
  ON pd_works USING GIN (search_vec);

-- Trigram indexes for typo-tolerant fallback / autocomplete on the
-- two highest-signal columns. Same field also gets the FTS treatment
-- above; trigram is the secondary path for ILIKE '%foo%' queries.
CREATE INDEX IF NOT EXISTS pd_works_title_trgm_idx
  ON pd_works USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pd_works_composer_trgm_idx
  ON pd_works USING GIN (composer gin_trgm_ops);

-- Cheap b-tree indexes for the structured filters (exact match).
CREATE INDEX IF NOT EXISTS pd_works_voicing_idx
  ON pd_works (voicing) WHERE voicing IS NOT NULL;
CREATE INDEX IF NOT EXISTS pd_works_language_idx
  ON pd_works (language) WHERE language IS NOT NULL;

-- Ingestion-watch index: rows last seen long ago = candidates for
-- soft-delete / re-check. Fast for the crawler's bookkeeping query.
CREATE INDEX IF NOT EXISTS pd_works_last_seen_idx
  ON pd_works (last_seen_at);

-- 5) updated_at maintenance --------------------------------------------
-- We don't have an updated_at column on this table because the
-- ingester touches every visible field on each re-crawl and updates
-- last_seen_at directly. If a single field changes, last_seen_at
-- captures the moment.

-- 6) RLS ----------------------------------------------------------------
ALTER TABLE pd_works ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user. The catalog is global by design;
-- there is no tenant scoping because every work is genuinely shared.
DROP POLICY IF EXISTS pd_works_read ON pd_works;
CREATE POLICY pd_works_read
  ON pd_works
  FOR SELECT
  TO authenticated
  USING (true);

-- Write: only platform super-admins. The cron ingester uses the
-- service-role key (which bypasses RLS) so this policy doesn't need
-- to permit it explicitly.
DROP POLICY IF EXISTS pd_works_admin_write ON pd_works;
CREATE POLICY pd_works_admin_write
  ON pd_works
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

-- 7) Search RPC ---------------------------------------------------------
-- SECURITY DEFINER so it can do the FTS ranking with the right
-- search_path. Returns ranked rows; the caller passes structured
-- filters that compose against the FTS query.
CREATE OR REPLACE FUNCTION pd_works_search(
  p_query      text DEFAULT NULL,
  p_voicing    text DEFAULT NULL,
  p_language   text DEFAULT NULL,
  p_composer   text DEFAULT NULL,
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
  source_page_url    text,
  license_type       gw_pd_license_type,
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
  )
  SELECT
    w.id,
    w.source,
    w.source_id,
    w.title,
    w.composer,
    w.voicing,
    w.language,
    w.source_page_url,
    w.license_type,
    w.attribution,
    (w.storage_key IS NOT NULL) AS has_cached_pdf,
    CASE
      WHEN (SELECT ts FROM q) IS NOT NULL
        THEN ts_rank(w.search_vec, (SELECT ts FROM q))
      ELSE 0
    END AS rank
  FROM pd_works w
  WHERE
    -- FTS match OR trigram-similar title (typo tolerance)
    (
      (SELECT ts FROM q) IS NULL
      OR w.search_vec @@ (SELECT ts FROM q)
      OR (p_query IS NOT NULL AND w.title ILIKE '%' || p_query || '%')
    )
    AND (p_voicing  IS NULL OR w.voicing  ILIKE p_voicing  || '%')
    AND (p_language IS NULL OR w.language ILIKE p_language || '%')
    AND (p_composer IS NULL OR w.composer ILIKE '%' || p_composer || '%')
  ORDER BY rank DESC, w.title ASC
  LIMIT GREATEST(1, LEAST(p_limit, 200))
  OFFSET GREATEST(0, p_offset);
$$;

GRANT EXECUTE ON FUNCTION pd_works_search(text, text, text, text, int, int) TO authenticated;
