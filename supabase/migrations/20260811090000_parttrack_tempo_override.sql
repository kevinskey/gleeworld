-- Director-set tempo for PartTrack renders. OMR frequently loses the tempo
-- marking (no_tempo warning -> 100 bpm fallback); this lets the confirm screen
-- pin the speed. NULL = use the score's own tempo (or the 100 bpm fallback).
ALTER TABLE public.gw_parttrack_scores
  ADD COLUMN IF NOT EXISTS tempo_override_bpm int
  CHECK (tempo_override_bpm IS NULL OR tempo_override_bpm BETWEEN 20 AND 300);
