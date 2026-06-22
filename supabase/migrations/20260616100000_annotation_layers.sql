-- Annotation layers: toggleable overlay groups (Fingerings, Bowing,
-- Conductor notes…). Each annotation row optionally belongs to one
-- layer; if unset the annotation is "ungrouped" and always visible.
-- Hiding a layer hides all of its annotations without deleting them.

CREATE TABLE IF NOT EXISTS public.gw_sheet_music_annotation_layers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  color TEXT NOT NULL DEFAULT '#ff0000',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_sheet_music_annotation_layers_score_idx
  ON public.gw_sheet_music_annotation_layers (sheet_music_id, sort_order);

-- annotation_layer_id is nullable so existing annotations remain "ungrouped".
ALTER TABLE public.gw_sheet_music_annotations
  ADD COLUMN IF NOT EXISTS annotation_layer_id UUID
    REFERENCES public.gw_sheet_music_annotation_layers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gw_sheet_music_annotations_layer_idx
  ON public.gw_sheet_music_annotations (annotation_layer_id)
  WHERE annotation_layer_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.gw_sheet_music_annotation_layers_set_tenant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_gw_sheet_music_annotation_layers_set_tenant
  ON public.gw_sheet_music_annotation_layers;
CREATE TRIGGER trg_gw_sheet_music_annotation_layers_set_tenant
  BEFORE INSERT ON public.gw_sheet_music_annotation_layers
  FOR EACH ROW EXECUTE FUNCTION public.gw_sheet_music_annotation_layers_set_tenant();

ALTER TABLE public.gw_sheet_music_annotation_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict
  ON public.gw_sheet_music_annotation_layers AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY layers_owner_select
  ON public.gw_sheet_music_annotation_layers FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY layers_owner_insert
  ON public.gw_sheet_music_annotation_layers FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY layers_owner_update
  ON public.gw_sheet_music_annotation_layers FOR UPDATE TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY layers_owner_delete
  ON public.gw_sheet_music_annotation_layers FOR DELETE TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
