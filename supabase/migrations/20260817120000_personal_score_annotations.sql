-- 20260817120000_personal_score_annotations.sql
-- Personal-score annotations. gw_sheet_music_annotations FKs gw_sheet_music,
-- so My Music scores (gw_personal_scores) could never persist markup — the
-- phase-1 ledger item this closes. DELIBERATELY NO tenant_id: personal scope,
-- same audit exception as gw_personal_scores (20260712120000). No layer
-- column: annotation layers (voice-part markings) are a group-library concept.
CREATE TABLE IF NOT EXISTS public.gw_personal_score_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_score_id uuid NOT NULL
    REFERENCES public.gw_personal_scores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number int NOT NULL,
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

-- Owner-only. The WITH CHECK subquery also stops annotating someone ELSE's
-- personal score (FK checks bypass RLS, so user_id alone is not enough).
-- Scans a DIFFERENT table than the policy's own — no 42P17 recursion risk.
DROP POLICY IF EXISTS gw_personal_score_annotations_select ON public.gw_personal_score_annotations;
CREATE POLICY gw_personal_score_annotations_select
  ON public.gw_personal_score_annotations FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS gw_personal_score_annotations_insert ON public.gw_personal_score_annotations;
CREATE POLICY gw_personal_score_annotations_insert
  ON public.gw_personal_score_annotations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.gw_personal_scores s
                WHERE s.id = personal_score_id AND s.user_id = auth.uid())
  );
DROP POLICY IF EXISTS gw_personal_score_annotations_update ON public.gw_personal_score_annotations;
CREATE POLICY gw_personal_score_annotations_update
  ON public.gw_personal_score_annotations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.gw_personal_scores s
                WHERE s.id = personal_score_id AND s.user_id = auth.uid())
  );
DROP POLICY IF EXISTS gw_personal_score_annotations_delete ON public.gw_personal_score_annotations;
CREATE POLICY gw_personal_score_annotations_delete
  ON public.gw_personal_score_annotations FOR DELETE
  USING (user_id = auth.uid());

-- Phase-2 fulfillment idempotency: partner-watermark re-invocation must not
-- duplicate the buyer's My Music row. Partial: uploads/cpdl are unconstrained.
-- Safe to create: prod has zero source='purchase' rows (verified 2026-08-17).
CREATE UNIQUE INDEX IF NOT EXISTS gw_personal_scores_purchase_uq
  ON public.gw_personal_scores (user_id, storage_path)
  WHERE source = 'purchase';
