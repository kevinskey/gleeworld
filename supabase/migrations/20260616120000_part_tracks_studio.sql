-- Part Tracks Studio schema.
--
-- A "project" is a recording session permanently linked to a score in
-- gw_sheet_music. Every track belongs to a project, and each track may
-- carry one bounced audio_url (the "current take") plus a history of
-- raw recordings in gw_part_tracks_recordings. The studio UI works
-- against this trio. RLS mirrors the rest of the music library tables:
-- tenant_isolation_restrict + permissive read inside the tenant.

CREATE TABLE IF NOT EXISTS public.gw_part_tracks_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  voicing TEXT,             -- SATB, SSA, TTBB, SAB, Unison, Instrumental
  tempo_bpm INTEGER,
  key_signature TEXT,
  accompaniment_url TEXT,
  accompaniment_title TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_part_tracks_projects_score_idx
  ON public.gw_part_tracks_projects (sheet_music_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.gw_part_tracks_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  project_id UUID NOT NULL REFERENCES public.gw_part_tracks_projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('accompaniment','soprano','alto','tenor','bass','solo','piano','custom')),
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#fbbf24',
  sort_order INTEGER NOT NULL DEFAULT 0,
  volume DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  pan DOUBLE PRECISION NOT NULL DEFAULT 0,
  muted BOOLEAN NOT NULL DEFAULT false,
  solo BOOLEAN NOT NULL DEFAULT false,
  audio_url TEXT,
  duration_sec DOUBLE PRECISION,
  waveform_peaks JSONB,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_part_tracks_tracks_project_idx
  ON public.gw_part_tracks_tracks (project_id, sort_order);

CREATE TABLE IF NOT EXISTS public.gw_part_tracks_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  track_id UUID NOT NULL REFERENCES public.gw_part_tracks_tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  audio_url TEXT NOT NULL,
  duration_sec DOUBLE PRECISION,
  waveform_peaks JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_part_tracks_recordings_track_idx
  ON public.gw_part_tracks_recordings (track_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.gw_part_tracks_set_tenant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_gw_part_tracks_projects_set_tenant ON public.gw_part_tracks_projects;
CREATE TRIGGER trg_gw_part_tracks_projects_set_tenant
  BEFORE INSERT ON public.gw_part_tracks_projects
  FOR EACH ROW EXECUTE FUNCTION public.gw_part_tracks_set_tenant();

DROP TRIGGER IF EXISTS trg_gw_part_tracks_tracks_set_tenant ON public.gw_part_tracks_tracks;
CREATE TRIGGER trg_gw_part_tracks_tracks_set_tenant
  BEFORE INSERT ON public.gw_part_tracks_tracks
  FOR EACH ROW EXECUTE FUNCTION public.gw_part_tracks_set_tenant();

DROP TRIGGER IF EXISTS trg_gw_part_tracks_recordings_set_tenant ON public.gw_part_tracks_recordings;
CREATE TRIGGER trg_gw_part_tracks_recordings_set_tenant
  BEFORE INSERT ON public.gw_part_tracks_recordings
  FOR EACH ROW EXECUTE FUNCTION public.gw_part_tracks_set_tenant();

ALTER TABLE public.gw_part_tracks_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_part_tracks_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_part_tracks_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_part_tracks_projects AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_restrict ON public.gw_part_tracks_tracks AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_restrict ON public.gw_part_tracks_recordings AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY part_tracks_projects_rw ON public.gw_part_tracks_projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY part_tracks_tracks_rw ON public.gw_part_tracks_tracks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY part_tracks_recordings_rw ON public.gw_part_tracks_recordings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
