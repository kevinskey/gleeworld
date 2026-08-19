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
