-- supabase/migrations/tests/prayer_reading_ranges_test.sql
-- Run against a DB with 20260804120000_prayer_calendar.sql and
-- 20260817120000_prayer_reading_ranges.sql applied.
BEGIN;

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'gw_prayer_readings'
            AND column_name = 'parsed_citation' AND data_type = 'jsonb'),
         'gw_prayer_readings.parsed_citation missing or wrong type';

  -- Still a reference table: the new column must not have smuggled tenant_id in.
  ASSERT (SELECT count(*) = 0 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'gw_prayer_readings'
            AND column_name = 'tenant_id'),
         'gw_prayer_readings: has tenant_id — reference tables must be tenant-neutral';
END $$;

-- The default must be a well-formed empty ParsedCitation, not NULL, so
-- prayer_day_full() can read ->>'usfmCode' etc. without a null check.
DO $$
DECLARE
  did uuid;
  parsed jsonb;
BEGIN
  INSERT INTO public.gw_prayer_calendar_days (rite, day_date, event_key, name)
  VALUES ('roman_catholic', DATE '2099-01-01', 'RangesTestDay', 'Ranges Test Day')
  RETURNING id INTO did;

  INSERT INTO public.gw_prayer_readings (calendar_day_id, slot, citation, schema_label, sort_order)
  VALUES (did, 'first_reading', 'Placeholder 1:1', '', 0);

  SELECT r.parsed_citation INTO parsed
  FROM public.gw_prayer_readings r
  WHERE r.calendar_day_id = did AND r.slot = 'first_reading';

  ASSERT parsed->>'usfmCode' IS NULL, 'default usfmCode should be NULL';
  ASSERT parsed->'ranges' = '[]'::jsonb, 'default ranges should be []';
  ASSERT parsed->'unparsed' = '[]'::jsonb, 'default unparsed should be []';
END $$;

ROLLBACK;
