-- Clickable jump targets drawn over the score (forScore "Links").
-- Tap-target circles on a source page that whisk the reader to a
-- target page — perfect for repeat signs, codas, D.S./D.C.
-- Coords stored as percentages of page width/height so they survive
-- re-rendering at any zoom / resolution.

CREATE TABLE IF NOT EXISTS public.gw_sheet_music_jumps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  source_page INTEGER NOT NULL CHECK (source_page > 0),
  source_x_pct DOUBLE PRECISION NOT NULL CHECK (source_x_pct >= 0 AND source_x_pct <= 1),
  source_y_pct DOUBLE PRECISION NOT NULL CHECK (source_y_pct >= 0 AND source_y_pct <= 1),
  source_radius_pct DOUBLE PRECISION NOT NULL DEFAULT 0.04 CHECK (source_radius_pct > 0 AND source_radius_pct < 0.5),
  target_page INTEGER NOT NULL CHECK (target_page > 0),
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_sheet_music_jumps_score_page_idx
  ON public.gw_sheet_music_jumps (sheet_music_id, source_page);

CREATE OR REPLACE FUNCTION public.gw_sheet_music_jumps_set_tenant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_gw_sheet_music_jumps_set_tenant
  ON public.gw_sheet_music_jumps;
CREATE TRIGGER trg_gw_sheet_music_jumps_set_tenant
  BEFORE INSERT ON public.gw_sheet_music_jumps
  FOR EACH ROW EXECUTE FUNCTION public.gw_sheet_music_jumps_set_tenant();

ALTER TABLE public.gw_sheet_music_jumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict
  ON public.gw_sheet_music_jumps AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY jumps_tenant_select
  ON public.gw_sheet_music_jumps FOR SELECT TO authenticated
  USING (true);

CREATE POLICY jumps_tenant_insert
  ON public.gw_sheet_music_jumps FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY jumps_tenant_update
  ON public.gw_sheet_music_jumps FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY jumps_tenant_delete
  ON public.gw_sheet_music_jumps FOR DELETE TO authenticated
  USING (true);
