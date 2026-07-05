-- Hymnal reference index — platform-wide catalog of published hymnal
-- contents (number + title + tune metadata). Titles and hymn numbers
-- are factual metadata (not copyrightable); hymn TEXTS are copyrighted
-- and deliberately have no column here.
--
-- Reference data, NOT tenant-scoped: every tenant reads the same
-- catalog. Writes are service_role only (seeded by migration/script).

CREATE TABLE IF NOT EXISTS gw_hymnals (
  id text PRIMARY KEY,              -- Hymnary.org hymnal ID (LMGM2012, GC2, …)
  title text NOT NULL,
  short_name text NOT NULL,         -- display label for autocomplete ("LMGM II")
  publisher text,
  publication_year int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gw_hymn_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hymnal_id text NOT NULL REFERENCES gw_hymnals(id) ON DELETE CASCADE,
  number text NOT NULL,             -- text: hymnals use 810a, H-3, roman numerals
  title text NOT NULL,
  first_line text,
  authors text,
  composers text,
  tune_title text,
  meter text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hymnal_id, number, title)
);

CREATE INDEX IF NOT EXISTS idx_gw_hymn_index_hymnal ON gw_hymn_index (hymnal_id);
-- ILIKE '%term%' autocomplete across ~3k rows is fine with a trigram index.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_gw_hymn_index_title_trgm ON gw_hymn_index USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_gw_hymn_index_firstline_trgm ON gw_hymn_index USING gin (first_line gin_trgm_ops);

ALTER TABLE gw_hymnals ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_hymn_index ENABLE ROW LEVEL SECURITY;

-- Global read-only reference data: any authenticated user may read;
-- only service_role writes (no INSERT/UPDATE/DELETE policies).
DROP POLICY IF EXISTS "hymnals readable" ON gw_hymnals;
CREATE POLICY "hymnals readable" ON gw_hymnals FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "hymn index readable" ON gw_hymn_index;
CREATE POLICY "hymn index readable" ON gw_hymn_index FOR SELECT TO authenticated USING (true);

INSERT INTO gw_hymnals (id, title, short_name, publisher, publication_year) VALUES
  ('LMGM1987', 'Lead Me, Guide Me (The African American Hymnal)', 'LMGM', 'GIA Publications', 1987),
  ('LMGM2012', 'Lead Me, Guide Me (2nd ed.)', 'LMGM II', 'GIA Publications', 2012),
  ('GC2',      'Gather Comprehensive, Second Edition', 'Gather', 'GIA Publications', 2004),
  ('BH2008',   'Baptist Hymnal 2008', 'Baptist Hymnal', 'LifeWay Worship', 2008)
ON CONFLICT (id) DO NOTHING;
