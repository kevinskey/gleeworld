-- Per-user "last opened" tracking for sheet music. Powers the Viewer's
-- "Recent" sort and a future Continue-Reading row. UPSERT on (user_id,
-- sheet_music_id) — we only need the latest open per pair, not history.

CREATE TABLE IF NOT EXISTS public.gw_sheet_music_recent_opens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  last_opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  open_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, sheet_music_id)
);

CREATE INDEX IF NOT EXISTS gw_sheet_music_recent_opens_user_idx
  ON public.gw_sheet_music_recent_opens (user_id, last_opened_at DESC);

CREATE OR REPLACE FUNCTION public.gw_sheet_music_recent_opens_set_tenant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_gw_sheet_music_recent_opens_set_tenant
  ON public.gw_sheet_music_recent_opens;
CREATE TRIGGER trg_gw_sheet_music_recent_opens_set_tenant
  BEFORE INSERT ON public.gw_sheet_music_recent_opens
  FOR EACH ROW EXECUTE FUNCTION public.gw_sheet_music_recent_opens_set_tenant();

ALTER TABLE public.gw_sheet_music_recent_opens ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict
  ON public.gw_sheet_music_recent_opens AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY recent_opens_owner_select
  ON public.gw_sheet_music_recent_opens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY recent_opens_owner_upsert
  ON public.gw_sheet_music_recent_opens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY recent_opens_owner_update
  ON public.gw_sheet_music_recent_opens FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY recent_opens_owner_delete
  ON public.gw_sheet_music_recent_opens FOR DELETE TO authenticated
  USING (user_id = auth.uid());
