-- Link tour events (individual dates/venues) to the trip they belong to.
--
-- WHY
-- The schema grew two parallel hierarchies that never met:
--
--   gw_tours        (the trip)  -> gw_tour_cities, gw_tour_checkins
--   gw_tour_events  (one date)  -> gw_tour_roster, gw_permission_slips,
--                                  gw_tour_crew
--
-- gw_tour_events had no reference to gw_tours, so "everyone on this trip" was
-- not expressible: rosters and permission slips are keyed per EVENT. A student
-- on a six-city tour therefore accumulates SIX permission slips — the unique
-- key is (event, student) — instead of one per trip. This column is the
-- prerequisite for trip-level rosters and trip-level slips.
--
-- NAMING
-- Deliberately `trip_id`, not `tour_id`. `tour_id` is already taken and means
-- two different things depending on the table:
--     gw_tour_cities.tour_id   -> gw_tours(id)        (a trip)
--     gw_tour_roster.tour_id   -> gw_tour_events(id)  (a single date)
--     gw_permission_slips.tour_id -> gw_tour_events(id)
-- Adding a third `tour_id` — on events, pointing back at trips — would make
-- that ambiguity actively dangerous to read. `trip_id` matches the user-facing
-- language ("Create a Trip", Travel Manager) and cannot be misread.
--
-- NULLABLE ON PURPOSE
-- Existing events predate trips and cannot be attributed to one automatically:
-- gw_tour_events carries no course_id in the live schema, so there is no safe
-- key to match on. NOT NULL would fail on existing rows. Unlinked events keep
-- working exactly as today; they simply don't appear under any trip.
--
-- ON DELETE SET NULL: deleting a trip must not delete the concert dates that
-- happened. They become unlinked, not destroyed.

ALTER TABLE public.gw_tour_events
  ADD COLUMN IF NOT EXISTS trip_id uuid
  REFERENCES public.gw_tours(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.gw_tour_events.trip_id IS
  'The gw_tours trip this date belongs to. NULL = not yet assigned to a trip. '
  'Distinct from gw_tour_roster.tour_id / gw_permission_slips.tour_id, which '
  'both point AT gw_tour_events, not at gw_tours.';

-- Partial index: the overwhelming majority of lookups are "events on trip X",
-- and unlinked rows are never the target of that query.
CREATE INDEX IF NOT EXISTS gw_tour_events_trip_id
  ON public.gw_tour_events (trip_id)
  WHERE trip_id IS NOT NULL;

-- NO BACKFILL IS PERFORMED.
-- A date-range heuristic (event.start_date between trip.start_date and
-- trip.end_date) would silently mis-assign events whenever two trips overlap or
-- sit adjacent, and permission slips hang off these rows — a wrong link means a
-- parent signs for the wrong trip. Assign existing events deliberately instead:
--
--   UPDATE public.gw_tour_events
--      SET trip_id = '<trip-uuid>'
--    WHERE id IN ('<event-uuid>', ...);
--
-- VERIFY (this DB has no schema_migrations — confirm by object):
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'gw_tour_events' AND column_name = 'trip_id';
--
--   SELECT indexname FROM pg_indexes
--    WHERE tablename = 'gw_tour_events' AND indexname = 'gw_tour_events_trip_id';
--
--   SELECT count(*) FILTER (WHERE trip_id IS NULL)  AS unlinked,
--          count(*) FILTER (WHERE trip_id IS NOT NULL) AS linked
--     FROM public.gw_tour_events;
