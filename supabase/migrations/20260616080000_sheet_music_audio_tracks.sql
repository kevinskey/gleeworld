-- Multiple audio tracks per score (forScore parity).
--
-- A score can now carry many bindings — "Rehearsal", "Accompaniment",
-- "Full mix", "Reference recording" — each with its own source (uploaded
-- file, media library item, YouTube URL, or Apple Music catalog ID).
-- One track per score is the default; that's what auto-loads when the
-- score opens. The legacy gw_sheet_music.audio_url / apple_music_*
-- columns stay populated as a backward-compat mirror of the default
-- track so any caller that hasn't migrated yet still sees something.

CREATE TABLE IF NOT EXISTS public.gw_sheet_music_audio_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (length(trim(label)) > 0),
  kind TEXT NOT NULL CHECK (kind IN ('file', 'media_library', 'youtube', 'apple_music')),
  audio_url TEXT,
  audio_title TEXT,
  apple_music_id TEXT,
  apple_music_storefront TEXT,
  apple_music_title TEXT,
  apple_music_artist TEXT,
  apple_music_artwork_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- One source field must be populated for each kind.
  CHECK (
    (kind IN ('file', 'media_library', 'youtube') AND audio_url IS NOT NULL)
    OR
    (kind = 'apple_music' AND apple_music_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS gw_sheet_music_audio_tracks_score_idx
  ON public.gw_sheet_music_audio_tracks (sheet_music_id, sort_order, created_at);

-- Partial unique index: at most one default track per score.
CREATE UNIQUE INDEX IF NOT EXISTS gw_sheet_music_audio_tracks_one_default_per_score
  ON public.gw_sheet_music_audio_tracks (sheet_music_id) WHERE is_default;

CREATE OR REPLACE FUNCTION public.gw_sheet_music_audio_tracks_set_tenant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_gw_sheet_music_audio_tracks_set_tenant
  ON public.gw_sheet_music_audio_tracks;
CREATE TRIGGER trg_gw_sheet_music_audio_tracks_set_tenant
  BEFORE INSERT ON public.gw_sheet_music_audio_tracks
  FOR EACH ROW EXECUTE FUNCTION public.gw_sheet_music_audio_tracks_set_tenant();

ALTER TABLE public.gw_sheet_music_audio_tracks ENABLE ROW LEVEL SECURITY;

-- Tenant isolation (RESTRICTIVE).
CREATE POLICY tenant_isolation_restrict
  ON public.gw_sheet_music_audio_tracks AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Anyone in the tenant can list tracks (matches sheet_music read visibility).
CREATE POLICY audio_tracks_tenant_select
  ON public.gw_sheet_music_audio_tracks FOR SELECT TO authenticated
  USING (true);

-- Writers: any authenticated tenant user (sheet_music itself is gated at
-- the UI level via canEditMusicLibrary; we mirror that openness here so
-- existing edit flows keep working without a separate permission table).
CREATE POLICY audio_tracks_tenant_insert
  ON public.gw_sheet_music_audio_tracks FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY audio_tracks_tenant_update
  ON public.gw_sheet_music_audio_tracks FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY audio_tracks_tenant_delete
  ON public.gw_sheet_music_audio_tracks FOR DELETE TO authenticated
  USING (true);

-- Backfill existing single-binding scores into the new table as one
-- default track. Apple Music wins over plain audio_url since the legacy
-- save logic clears one when setting the other.
INSERT INTO public.gw_sheet_music_audio_tracks
  (tenant_id, sheet_music_id, label, kind, apple_music_id, apple_music_storefront, apple_music_title, apple_music_artist, apple_music_artwork_url, audio_title, is_default, sort_order)
SELECT
  s.tenant_id,
  s.id,
  COALESCE(s.audio_title, s.apple_music_title, 'Apple Music'),
  'apple_music',
  s.apple_music_id,
  s.apple_music_storefront,
  s.apple_music_title,
  s.apple_music_artist,
  s.apple_music_artwork_url,
  COALESCE(s.audio_title, s.apple_music_title, 'Apple Music'),
  true,
  0
FROM public.gw_sheet_music s
WHERE s.apple_music_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.gw_sheet_music_audio_tracks
  (tenant_id, sheet_music_id, label, kind, audio_url, audio_title, is_default, sort_order)
SELECT
  s.tenant_id,
  s.id,
  COALESCE(s.audio_title, 'Recording'),
  CASE WHEN s.audio_url ~* 'youtu(be\.com|\.be)' THEN 'youtube' ELSE 'file' END,
  s.audio_url,
  COALESCE(s.audio_title, 'Recording'),
  true,
  0
FROM public.gw_sheet_music s
WHERE s.audio_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.gw_sheet_music_audio_tracks t
    WHERE t.sheet_music_id = s.id AND t.is_default
  );
