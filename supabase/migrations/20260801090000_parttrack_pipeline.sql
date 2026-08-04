-- PartTrack pipeline: score -> analyzed parts -> rights -> rendered stems/mixes.
-- Spec: docs/superpowers/specs/2026-07-31-parttrack-phase1-design.md

CREATE TABLE IF NOT EXISTS public.gw_parttrack_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  sheet_music_id      uuid NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  source_type         text NOT NULL CHECK (source_type IN ('musicxml','mxl','midi')),
  source_path         text NOT NULL,
  normalized_mxl_path text,
  status              text NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','analyzing','awaiting_confirmation','rendering','ready','failed')),
  validation_report   jsonb NOT NULL DEFAULT '[]'::jsonb,
  manifest            jsonb,
  timbre              text NOT NULL DEFAULT 'piano' CHECK (timbre IN ('piano','oboe','choir')),
  error_message       text,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sheet_music_id)
);
CREATE INDEX IF NOT EXISTS gw_parttrack_scores_sheet_idx
  ON public.gw_parttrack_scores (sheet_music_id);

CREATE TABLE IF NOT EXISTS public.gw_parttrack_parts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id          uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  source_part_index int NOT NULL,
  source_staff      int,
  source_voice      int,
  role              text NOT NULL DEFAULT 'other',
  label             text NOT NULL,
  confidence        numeric NOT NULL DEFAULT 0,
  confirmed         boolean NOT NULL DEFAULT false,
  include           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_parttrack_parts_score_idx
  ON public.gw_parttrack_parts (score_id, source_part_index);

CREATE TABLE IF NOT EXISTS public.gw_parttrack_rights (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id       uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  basis          text NOT NULL CHECK (basis IN
                 ('own_work','public_domain','ccli','onelicense','publisher_permission','publisher_cleared')),
  license_number text,
  attested_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  attested_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, score_id)
);

CREATE TABLE IF NOT EXISTS public.gw_parttrack_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id      uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('analyze','render')),
  status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error')),
  attempts      int NOT NULL DEFAULT 0,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  finished_at   timestamptz
);
CREATE INDEX IF NOT EXISTS gw_parttrack_jobs_poll_idx
  ON public.gw_parttrack_jobs (status, created_at);

CREATE TABLE IF NOT EXISTS public.gw_parttrack_renders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id    uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('stem','mix')),
  part_role   text,
  mix_preset  text CHECK (mix_preset IN ('strong','plus_piano','alone','full','piano_only')),
  audio_path  text NOT NULL,
  duration_ms int,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_parttrack_renders_score_idx
  ON public.gw_parttrack_renders (score_id, kind);

-- Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('parttrack', 'parttrack', false)
ON CONFLICT (id) DO NOTHING;

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.gw_parttrack_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS gw_parttrack_scores_touch ON public.gw_parttrack_scores;
CREATE TRIGGER gw_parttrack_scores_touch BEFORE UPDATE ON public.gw_parttrack_scores
  FOR EACH ROW EXECUTE FUNCTION public.gw_parttrack_touch_updated_at();

-- Rights gate: a render job cannot exist without an attestation.
CREATE OR REPLACE FUNCTION public.gw_parttrack_render_requires_rights()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind = 'render' AND NOT EXISTS (
    SELECT 1 FROM public.gw_parttrack_rights r WHERE r.score_id = NEW.score_id
  ) THEN
    RAISE EXCEPTION 'Rights attestation required before generating part tracks';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gw_parttrack_jobs_rights_gate ON public.gw_parttrack_jobs;
CREATE TRIGGER gw_parttrack_jobs_rights_gate BEFORE INSERT ON public.gw_parttrack_jobs
  FOR EACH ROW EXECUTE FUNCTION public.gw_parttrack_render_requires_rights();

-- RLS: enable + RESTRICTIVE tenant-iso on every table
ALTER TABLE public.gw_parttrack_scores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_parttrack_parts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_parttrack_rights  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_parttrack_jobs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_parttrack_renders ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_parttrack_scores','gw_parttrack_parts','gw_parttrack_rights',
    'gw_parttrack_jobs','gw_parttrack_renders'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %1$s_tenant_iso ON public.%1$s; ' ||
      'CREATE POLICY %1$s_tenant_iso ON public.%1$s AS RESTRICTIVE ' ||
      'FOR ALL TO authenticated, anon ' ||
      'USING (tenant_id = public.current_tenant_id()) ' ||
      'WITH CHECK (tenant_id = public.current_tenant_id());',
      t
    );
  END LOOP;
END $$;

-- Permissive per-role policies: tenant members read; admins/creators write.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_parttrack_scores','gw_parttrack_parts','gw_parttrack_rights',
    'gw_parttrack_jobs','gw_parttrack_renders'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %1$s_read ON public.%1$s; ' ||
      'CREATE POLICY %1$s_read ON public.%1$s FOR SELECT TO authenticated USING (true); ' ||
      'DROP POLICY IF EXISTS %1$s_admin_write ON public.%1$s; ' ||
      'CREATE POLICY %1$s_admin_write ON public.%1$s FOR ALL TO authenticated ' ||
      'USING (public.is_current_user_admin_or_super_admin()) ' ||
      'WITH CHECK (public.is_current_user_admin_or_super_admin());',
      t
    );
  END LOOP;
END $$;
