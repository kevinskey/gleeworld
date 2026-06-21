-- Audition form extensions — fields requested for the public-facing audition
-- form (instrumental section type, instrument experience years, dance skill,
-- and merch sizing). Public form lives at /audition (AuditionPage.tsx); admin
-- detail views live under the Auditions module.
--
-- All columns are nullable + IF NOT EXISTS so re-running the migration is a
-- no-op and existing rows keep working without backfill.

ALTER TABLE public.audition_applications
  ADD COLUMN IF NOT EXISTS section_type TEXT
    CHECK (section_type IN ('vocal', 'instrumental')),
  ADD COLUMN IF NOT EXISTS years_instrument_experience INTEGER
    CHECK (years_instrument_experience IS NULL OR years_instrument_experience >= 0),
  ADD COLUMN IF NOT EXISTS can_dance BOOLEAN,
  ADD COLUMN IF NOT EXISTS tshirt_size TEXT
    CHECK (tshirt_size IN ('S', 'M', 'L', 'XL', 'XXL', 'XXXL'));

-- Make sure PostgREST picks up the new columns on next request.
NOTIFY pgrst, 'reload schema';
