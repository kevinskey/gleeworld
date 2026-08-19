-- One permission slip per student per TRIP, instead of one per concert date.
--
-- WHY
-- gw_permission_slips.tour_id references gw_tour_events — a single date/venue —
-- and the unique key is (tour_id, student_user_id). A student on a six-city
-- tour therefore accumulates SIX slips, and a guardian is asked to sign six
-- times for one trip. What a school actually wants is one signed slip covering
-- the trip.
--
-- Requires 20260804150000_link_tour_events_to_trips.sql, which added
-- gw_tour_events.trip_id. Without that link an event cannot name its trip.
--
-- SAFETY
-- Signed slips are legal records. Nothing here rewrites, re-keys or deletes an
-- existing row: trip_id is added alongside tour_id, and every slip already in
-- the table keeps its event scope, its signature, and its audit trail exactly
-- as signed. New slips are created trip-scoped where the trip is known, and
-- fall back to the old per-event behaviour where it is not.

-- 1. Trip scope, alongside the existing event scope.
ALTER TABLE public.gw_permission_slips
  ADD COLUMN IF NOT EXISTS trip_id uuid
  REFERENCES public.gw_tours(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.gw_permission_slips.trip_id IS
  'The trip this slip covers — one slip per student per trip. NULL on legacy '
  'rows created before trips, which remain scoped to a single event via tour_id.';

-- 2. tour_id must become nullable: a trip-scoped slip covers the whole trip and
--    is not tied to any one date. Existing rows are unaffected — they keep the
--    event id they were created with.
ALTER TABLE public.gw_permission_slips
  ALTER COLUMN tour_id DROP NOT NULL;

-- 3. One slip per student per trip. Partial, so legacy event-scoped rows
--    (trip_id IS NULL) are not caught by it and the original
--    UNIQUE (tour_id, student_user_id) keeps governing them.
CREATE UNIQUE INDEX IF NOT EXISTS perm_slips_trip_student
  ON public.gw_permission_slips (trip_id, student_user_id)
  WHERE trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS perm_slips_tenant_trip
  ON public.gw_permission_slips (tenant_id, trip_id)
  WHERE trip_id IS NOT NULL;

-- 4. A row must be scoped to something. Without this, a bug that dropped both
--    ids would produce an orphan slip belonging to no trip and no date.
ALTER TABLE public.gw_permission_slips
  DROP CONSTRAINT IF EXISTS perm_slips_scope_present;
ALTER TABLE public.gw_permission_slips
  ADD CONSTRAINT perm_slips_scope_present
  CHECK (trip_id IS NOT NULL OR tour_id IS NOT NULL);

-- 5. Auto-create, now trip-aware.
--
--    Resolves the roster row's event to its trip. When the event belongs to a
--    trip we create ONE slip for that trip and dedupe on (trip, student), so
--    rostering the same student onto five more dates of the same trip adds
--    nothing. When the event has no trip yet we keep the original per-event
--    behaviour rather than silently skipping the student.
CREATE OR REPLACE FUNCTION gw_create_permission_slip_for_roster()
RETURNS TRIGGER AS $$
DECLARE
  is_k12    BOOLEAN;
  v_trip_id UUID;
BEGIN
  -- Roster rows carrying no event cannot be attributed to a trip either.
  IF NEW.tour_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(k12_ensemble, false) INTO is_k12
  FROM gw_branding_settings
  WHERE tenant_id = current_tenant_id();

  IF NOT is_k12 THEN
    RETURN NEW;
  END IF;

  SELECT e.trip_id INTO v_trip_id
  FROM gw_tour_events e
  WHERE e.id = NEW.tour_id;

  IF v_trip_id IS NOT NULL THEN
    -- Trip-scoped: one per student per trip, regardless of how many of the
    -- trip's dates they are rostered on.
    INSERT INTO gw_permission_slips (trip_id, student_user_id)
    VALUES (v_trip_id, NEW.user_id)
    ON CONFLICT (trip_id, student_user_id) WHERE trip_id IS NOT NULL DO NOTHING;
  ELSE
    -- Unlinked date: behave exactly as before.
    INSERT INTO gw_permission_slips (tour_id, student_user_id)
    VALUES (NEW.tour_id, NEW.user_id)
    ON CONFLICT (tour_id, student_user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE ON EXISTING SLIPS
-- Legacy per-event slips are deliberately NOT collapsed into trip slips. Doing
-- so would have to choose which of several signatures survives, and discard
-- the rest — destroying signed records to tidy a key. Assign them explicitly
-- if you want them migrated, once you have confirmed which trip they belong to:
--
--   UPDATE public.gw_permission_slips s
--      SET trip_id = e.trip_id
--     FROM public.gw_tour_events e
--    WHERE s.tour_id = e.id
--      AND e.trip_id IS NOT NULL
--      AND s.trip_id IS NULL
--      AND s.status = 'pending';   -- unsigned only; never re-key a signature
--
-- VERIFY (no schema_migrations in this DB — confirm by object):
--
--   SELECT column_name, is_nullable FROM information_schema.columns
--    WHERE table_name = 'gw_permission_slips' AND column_name IN ('trip_id','tour_id');
--
--   SELECT indexname FROM pg_indexes
--    WHERE tablename = 'gw_permission_slips'
--      AND indexname IN ('perm_slips_trip_student','perm_slips_tenant_trip');
--
--   SELECT conname FROM pg_constraint WHERE conname = 'perm_slips_scope_present';
