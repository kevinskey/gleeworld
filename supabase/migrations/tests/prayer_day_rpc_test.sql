-- supabase/migrations/tests/prayer_day_rpc_test.sql
-- Seeds two celebrations on one date, asserts the RPC shape and ordering,
-- then rolls back.
BEGIN;

INSERT INTO public.gw_prayer_calendar_days
  (id, rite, day_date, event_key, name, rank_grade, rank_label, color,
   liturgical_season, sunday_cycle, psalter_week)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'roman_catholic', DATE '1999-11-30',
   'TestSunday', 'First Sunday of Advent', 6, 'Sunday', ARRAY['purple'],
   'ADVENT', 'A', 1),
  -- A lower-ranking optional memorial on the same date. rank_grade is an INT;
  -- ordering it as text would sort 10 before 6.
  ('22222222-2222-2222-2222-222222222222', 'roman_catholic', DATE '1999-11-30',
   'TestMemorial', 'Optional Memorial', 10, 'Optional memorial', ARRAY['white'],
   'ADVENT', 'A', 1);

INSERT INTO public.gw_prayer_readings
  (calendar_day_id, slot, citation, schema_label, sort_order, source)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'gospel', 'Matthew 24:37-44', '', 4, 'test'),
  ('11111111-1111-1111-1111-111111111111', 'first_reading', 'Isaiah 2:1-5', '', 0, 'test'),
  -- Christmas-style nested formulary: same slot, different schema_label.
  ('11111111-1111-1111-1111-111111111111', 'gospel', 'Luke 2:1-14', 'night', 1, 'test');

DO $$
DECLARE result jsonb;
BEGIN
  result := public.prayer_day(DATE '1999-11-30');

  ASSERT result->>'date' = '1999-11-30', 'date wrong: ' || coalesce(result->>'date','<null>');
  ASSERT result->>'rite' = 'roman_catholic', 'rite wrong';
  ASSERT jsonb_array_length(result->'events') = 2, 'expected 2 events';

  -- Highest rank first. rank_grade 10 must beat 6 numerically.
  ASSERT result->'events'->0->>'event_key' = 'TestMemorial',
         'events not ordered by numeric rank, got ' || (result->'events'->0->>'event_key');

  ASSERT result->'events'->1->>'name' = 'First Sunday of Advent', 'event name wrong';
  ASSERT result->'events'->1->>'sunday_cycle' = 'A', 'cycle wrong';
  ASSERT result->'events'->1->>'liturgical_season' = 'ADVENT', 'season wrong';
  ASSERT jsonb_array_length(result->'events'->1->'readings') = 3, 'expected 3 readings';

  -- Default formulary (schema_label '') sorts before named ones, and within a
  -- formulary readings follow sort_order, not insertion order.
  ASSERT result->'events'->1->'readings'->0->>'slot' = 'first_reading',
         'reading order wrong, got ' || (result->'events'->1->'readings'->0->>'slot');
  ASSERT result->'events'->1->'readings'->1->>'citation' = 'Matthew 24:37-44', 'gospel wrong';
  ASSERT result->'events'->1->'readings'->2->>'schema_label' = 'night',
         'nested formulary should sort last';

  -- An event with no readings must return [] rather than null.
  ASSERT result->'events'->0->'readings' = '[]'::jsonb,
         'event without readings should have an empty array';

  -- A date with nothing imported returns an empty event list, never NULL.
  result := public.prayer_day(DATE '1900-01-01');
  ASSERT result IS NOT NULL, 'RPC returned NULL for an unknown date';
  ASSERT jsonb_array_length(result->'events') = 0, 'unknown date should have 0 events';

  -- An unknown rite must not leak Roman Catholic rows.
  result := public.prayer_day(DATE '1999-11-30', 'rcl');
  ASSERT jsonb_array_length(result->'events') = 0, 'rite filter not applied';
END $$;

ROLLBACK;
