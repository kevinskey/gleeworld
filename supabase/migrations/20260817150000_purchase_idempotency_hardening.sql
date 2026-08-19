-- Purchase-fulfillment idempotency + annotation UPDATE-policy hardening.
-- Salvaged from PR #693 after #694 landed the annotations table itself.

-- partner-watermark re-invocation must not duplicate the buyer's My Music
-- row: 23505 from this index is treated as already-fulfilled by the
-- function. Partial on purpose — upload/cpdl rows stay unconstrained.
-- Safe to create: prod had zero source='purchase' rows on 2026-08-17
-- (no purchase has ever fulfilled; the partner webhook endpoint was
-- never registered).
CREATE UNIQUE INDEX IF NOT EXISTS gw_personal_scores_purchase_uq
  ON public.gw_personal_scores (user_id, storage_path)
  WHERE source = 'purchase';

-- 20260817120000's UPDATE policy lets an owner repoint personal_score_id
-- at a score they don't own (the FK checks existence, not ownership).
-- Harmless today — SELECT still scopes to the owner — but it breaks the
-- invariant the INSERT policy enforces. Re-create with the same
-- ownership re-check.
DROP POLICY IF EXISTS gw_personal_score_annotations_update
  ON public.gw_personal_score_annotations;
CREATE POLICY gw_personal_score_annotations_update
  ON public.gw_personal_score_annotations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.gw_personal_scores s
      WHERE s.id = personal_score_id AND s.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
