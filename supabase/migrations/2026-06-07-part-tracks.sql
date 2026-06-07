-- Applied to production self-hosted on 2026-06-06 via psql.
-- Schema for the Part Tracks module: directors upload MP3s per voice
-- part on each piece, singers practice their part.

CREATE TABLE IF NOT EXISTS public.gw_part_tracks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES public.gw_tenants(id) DEFAULT public.current_tenant_id(),
  piece_title   text NOT NULL,
  voice_part    text NOT NULL,
  audio_url     text,
  notes         text,
  uploaded_by   uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  is_active     boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gw_part_tracks_tenant ON public.gw_part_tracks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_part_tracks_piece  ON public.gw_part_tracks(piece_title);
CREATE INDEX IF NOT EXISTS idx_gw_part_tracks_voice  ON public.gw_part_tracks(voice_part);

ALTER TABLE public.gw_part_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_part_tracks
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY part_tracks_authed_read  ON public.gw_part_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY part_tracks_authed_write ON public.gw_part_tracks FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_set_tenant_id_part_tracks
  BEFORE INSERT ON public.gw_part_tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

CREATE OR REPLACE FUNCTION public.set_part_tracks_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_part_tracks_updated_at
  BEFORE UPDATE ON public.gw_part_tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_part_tracks_updated_at();
