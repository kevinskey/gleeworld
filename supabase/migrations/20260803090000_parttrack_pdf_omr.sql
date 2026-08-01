-- Phase 3: PDF input via OMR. Widens the source_type CHECK.
ALTER TABLE public.gw_parttrack_scores
  DROP CONSTRAINT IF EXISTS gw_parttrack_scores_source_type_check;
ALTER TABLE public.gw_parttrack_scores
  ADD CONSTRAINT gw_parttrack_scores_source_type_check
  CHECK (source_type IN ('musicxml','mxl','midi','pdf_omr'));
