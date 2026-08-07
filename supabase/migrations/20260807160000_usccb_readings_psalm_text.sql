-- Keep the whole responsorial psalm, not only its refrain.
--
-- The backfill stored `responsorial_psalm` (the citation) and `psalm_response`
-- (the R. refrain) and threw the verses away. But gw_liturgy_masses.psalm_full
-- is a field the planner shows and lets you edit, so a plan pulled from the
-- cache came back with a refrain where the psalm should be — the one reading a
-- music director is most likely to actually need in front of them.
--
-- Separate column rather than overloading `responsorial_psalm`, which holds the
-- citation and is mapped to the planner's citation field.

ALTER TABLE public.usccb_readings
  ADD COLUMN IF NOT EXISTS psalm_text text;

COMMENT ON COLUMN public.usccb_readings.psalm_text IS
  'Full responsorial psalm text including verses. psalm_response holds only '
  'the R. refrain; responsorial_psalm holds the citation.';
