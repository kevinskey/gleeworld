-- supabase/migrations/tests/prayer_reading_ranges_test.sql
-- Run against a DB with 20260918120000_prayer_reading_ranges.sql applied.
BEGIN;

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'gw_prayer_readings'
            AND column_name = 'usfm_code' AND data_type = 'text'),
         'usfm_code column missing or wrong type';
  ASSERT (SELECT count(*) = 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'gw_prayer_readings'
            AND column_name = 'ranges' AND data_type = 'jsonb'),
         'ranges column missing or not jsonb';
  ASSERT (SELECT is_nullable = 'NO' FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'gw_prayer_readings'
            AND column_name = 'ranges'),
         'ranges must be NOT NULL (default ''[]'' for unparsed citations)';
END $$;

ROLLBACK;
