-- My Music organization: tags + favorites on gw_personal_scores.
--
-- Tags over folders on purpose: no second table, a score can live under
-- several labels, and the tab's flat-list + chip-filter interaction stays.
--
-- gw_personal_scores deliberately has NO tenant_id (see 20260712120000 and
-- migrations/tests/personal_music_library_test.sql — the personal library
-- follows the person across tenants). The owner-only RLS policies
-- (auth.uid() = user_id for all four verbs) already cover these columns;
-- nothing to add.

ALTER TABLE public.gw_personal_scores
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS gw_personal_scores_tags_gin
  ON public.gw_personal_scores USING gin (tags);
