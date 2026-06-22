-- Bookmarks within a sheet music PDF: a user marks a page as e.g.
-- "Letter B", "Coda", "Sopranos enter" and can jump straight to it from
-- the viewer toolbar. forScore parity feature.
--
-- Per-user by default (each user keeps their own labels). RLS mirrors
-- gw_sheet_music_annotations so the same tenant + study-score sharing
-- rules apply.

CREATE TABLE IF NOT EXISTS public.gw_sheet_music_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  label TEXT NOT NULL CHECK (length(trim(label)) > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_sheet_music_bookmarks_score_user_idx
  ON public.gw_sheet_music_bookmarks (sheet_music_id, user_id, sort_order, page_number);

-- BEFORE INSERT trigger so writes that omit tenant_id still satisfy the
-- RESTRICTIVE tenant_isolation_restrict policy (same pattern used across
-- public tables — see reference_gleeworld_multitenant memory note).
CREATE OR REPLACE FUNCTION public.gw_sheet_music_bookmarks_set_tenant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_gw_sheet_music_bookmarks_set_tenant
  ON public.gw_sheet_music_bookmarks;
CREATE TRIGGER trg_gw_sheet_music_bookmarks_set_tenant
  BEFORE INSERT ON public.gw_sheet_music_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.gw_sheet_music_bookmarks_set_tenant();

ALTER TABLE public.gw_sheet_music_bookmarks ENABLE ROW LEVEL SECURITY;

-- Tenant isolation (RESTRICTIVE) — every other policy must AND with this.
CREATE POLICY tenant_isolation_restrict
  ON public.gw_sheet_music_bookmarks AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Owner read/write — the simplest case: my bookmarks are mine.
CREATE POLICY bookmarks_owner_select
  ON public.gw_sheet_music_bookmarks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY bookmarks_owner_insert
  ON public.gw_sheet_music_bookmarks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY bookmarks_owner_update
  ON public.gw_sheet_music_bookmarks FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY bookmarks_owner_delete
  ON public.gw_sheet_music_bookmarks FOR DELETE TO authenticated
  USING (user_id = auth.uid());
