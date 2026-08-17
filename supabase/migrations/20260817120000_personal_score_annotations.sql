-- Annotations for personal (My Music) scores.
--
-- gw_sheet_music_annotations FKs gw_sheet_music, so personal scores
-- (gw_personal_scores) could never persist markup — the viewer hid or
-- errored on the affordance. This table is the personal-side twin.
--
-- MULTI-TENANT AUDIT NOTE: like gw_personal_scores itself, this table
-- deliberately has NO tenant_id and NO tenant isolation policy. A personal
-- library follows the person across tenants; every row is reachable only
-- by its owner via auth.uid(). This is the documented exception pattern
-- (see 20260712120000_personal_music_library.sql and the all-clear in
-- 20260808110000_close_two_confirmed_rls_holes.sql).
--
-- No layers: gw_sheet_music_annotation_layers is tenant-fenced, so
-- personal annotations are always "ungrouped" (viewer treats null layer
-- as always-visible).

CREATE TABLE IF NOT EXISTS public.gw_personal_score_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_score_id uuid NOT NULL
    REFERENCES public.gw_personal_scores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  annotation_type text NOT NULL
    CHECK (annotation_type IN ('drawing','highlight','text_note','stamp')),
  annotation_data jsonb NOT NULL,
  position_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_personal_score_annotations_score_page_idx
  ON public.gw_personal_score_annotations (personal_score_id, page_number);

ALTER TABLE public.gw_personal_score_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY gw_personal_score_annotations_select
  ON public.gw_personal_score_annotations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY gw_personal_score_annotations_insert
  ON public.gw_personal_score_annotations FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.gw_personal_scores s
      WHERE s.id = personal_score_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY gw_personal_score_annotations_update
  ON public.gw_personal_score_annotations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY gw_personal_score_annotations_delete
  ON public.gw_personal_score_annotations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
