CREATE TABLE IF NOT EXISTS gw_partner_scores (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id                 uuid NOT NULL REFERENCES gw_partners(id) ON DELETE CASCADE,
  title                      text NOT NULL,
  composer                   text,
  arranger                   text,
  voicing                    text,
  ensemble_type              text,
  difficulty_grade           text,
  language                   text,
  description                text,
  tags                       text[],
  price_cents                integer NOT NULL CHECK (price_cents BETWEEN 100 AND 5000),
  currency                   text NOT NULL DEFAULT 'USD',
  master_storage_path        text NOT NULL,
  thumbnail_storage_path     text,
  sample_audio_storage_path  text,
  page_count                 integer,
  status                     text NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','published','unlisted','removed')),
  search_vec                 tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(title, ''))),        'A') ||
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(composer, ''))),     'B') ||
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(voicing, ''))),      'C') ||
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(description, ''))),  'D')
  ) STORED,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_partner_scores_partner_idx  ON gw_partner_scores (partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_partner_scores_status_idx   ON gw_partner_scores (status) WHERE status IN ('published','unlisted');
CREATE INDEX IF NOT EXISTS gw_partner_scores_ensemble_idx ON gw_partner_scores (ensemble_type) WHERE ensemble_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS gw_partner_scores_search_vec_idx ON gw_partner_scores USING GIN (search_vec);
CREATE INDEX IF NOT EXISTS gw_partner_scores_title_trgm ON gw_partner_scores USING GIN (title gin_trgm_ops);

ALTER TABLE gw_partner_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_partner_scores_public_read ON gw_partner_scores;
CREATE POLICY gw_partner_scores_public_read
  ON gw_partner_scores FOR SELECT TO authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS gw_partner_scores_owner_all ON gw_partner_scores;
CREATE POLICY gw_partner_scores_owner_all
  ON gw_partner_scores FOR ALL TO authenticated
  USING (partner_id = my_partner_id())
  WITH CHECK (partner_id = my_partner_id());

DROP POLICY IF EXISTS gw_partner_scores_admin_all ON gw_partner_scores;
CREATE POLICY gw_partner_scores_admin_all
  ON gw_partner_scores FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  );

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_gw_partner_scores_updated_at ON gw_partner_scores;
CREATE TRIGGER trg_gw_partner_scores_updated_at
BEFORE UPDATE ON gw_partner_scores
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
