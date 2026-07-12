-- supabase/migrations/20260712120000_personal_music_library.sql
-- Personal music library (spec: docs/superpowers/specs/2026-07-12-personal-music-library-design.md)
--
-- gw_personal_scores intentionally has NO tenant_id: the personal library
-- follows the person across tenants, like gw_sheet_music_favorites and the
-- annotation tables. Multi-tenant RLS audits: this is a deliberate exception.

CREATE TABLE IF NOT EXISTS public.gw_personal_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  composer text,
  voicing text,
  source text NOT NULL CHECK (source IN ('upload','cpdl','purchase')),
  pd_work_id uuid REFERENCES public.pd_works(id),
  entitlement_id uuid REFERENCES public.gw_store_entitlements(id),
  storage_path text NOT NULL,
  thumbnail_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_personal_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_personal_scores_select ON public.gw_personal_scores;
CREATE POLICY gw_personal_scores_select ON public.gw_personal_scores
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_scores_insert ON public.gw_personal_scores;
CREATE POLICY gw_personal_scores_insert ON public.gw_personal_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_scores_update ON public.gw_personal_scores;
CREATE POLICY gw_personal_scores_update ON public.gw_personal_scores
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_scores_delete ON public.gw_personal_scores;
CREATE POLICY gw_personal_scores_delete ON public.gw_personal_scores
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS gw_personal_scores_user_idx
  ON public.gw_personal_scores (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS gw_personal_scores_pd_uq
  ON public.gw_personal_scores (user_id, pd_work_id) WHERE pd_work_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS gw_personal_scores_entitlement_uq
  ON public.gw_personal_scores (user_id, entitlement_id) WHERE entitlement_id IS NOT NULL;

-- Private bucket for personal uploads. Path layout: <user_id>/uploads/<uuid>.pdf
INSERT INTO storage.buckets (id, name, public)
VALUES ('personal-scores', 'personal-scores', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS personal_scores_bucket_read ON storage.objects;
CREATE POLICY personal_scores_bucket_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'personal-scores'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS personal_scores_bucket_write ON storage.objects;
CREATE POLICY personal_scores_bucket_write ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'personal-scores'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS personal_scores_bucket_delete ON storage.objects;
CREATE POLICY personal_scores_bucket_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'personal-scores'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Tenant library sharing: members only see scores an admin marked shared.
ALTER TABLE public.gw_sheet_music
  ADD COLUMN IF NOT EXISTS shared_with_members boolean NOT NULL DEFAULT false;
-- types regen pending
