-- supabase/migrations/tests/prayer_day_full_test.sql
-- Run against a DB with 20260804120000_prayer_calendar.sql,
-- 20260804130000_prayer_bible.sql, 20260806120000_prayer_reading_text.sql,
-- 20260918120000_prayer_reading_ranges.sql and
-- 20260918121500_prayer_day_full_rpc.sql applied.
--
-- Seeds its own calendar day, readings and Bible verses so it is
-- self-contained and repeatable, same pattern as prayer_day_rpc_test.sql and
-- prayer_reading_text_test.sql.
BEGIN;

DO $$
DECLARE
  tid  uuid;
  psa  uuid;
  dayid uuid := '22222222-2222-2222-2222-222222222222';
  result jsonb;
BEGIN
  INSERT INTO public.gw_bible_translations (code, name, has_deuterocanon, attribution)
  VALUES ('TESTV', 'Test Version', false, 'Test Version. Public domain, for testing only.')
  RETURNING id INTO tid;

  INSERT INTO public.gw_bible_books (translation_id, usfm_code, name, canon_order, testament)
  VALUES (tid, 'PSA', 'Psalms', 19, 'OT') RETURNING id INTO psa;

  INSERT INTO public.gw_bible_verses (book_id, chapter, verse, text) VALUES
    (psa, 23, 1, 'The LORD is my shepherd; I shall lack nothing.'),
    (psa, 23, 2, 'He makes me lie down in green pastures.');

  INSERT INTO public.gw_prayer_calendar_days
    (id, rite, day_date, event_key, name, rank_grade, rank_label, color,
     liturgical_season, sunday_cycle, psalter_week)
  VALUES
    (dayid, 'roman_catholic', DATE '2026-03-01', 'TestDay', 'A Test Celebration',
     3, 'Feast', ARRAY['white'], 'ORDINARY_TIME', NULL, 1);

  -- One reading that resolves to real verse text...
  INSERT INTO public.gw_prayer_readings
    (calendar_day_id, slot, citation, schema_label, sort_order, usfm_code, ranges)
  VALUES
    (dayid, 'responsorial_psalm', 'Psalm 23:1-2', '', 0, 'PSA',
     '[{"startChapter":23,"startVerse":1,"endChapter":23,"endVerse":2}]'::jsonb);

  -- ...and one that never parsed (a "note" row), which must degrade
  -- gracefully rather than erroring the whole RPC.
  INSERT INTO public.gw_prayer_readings
    (calendar_day_id, slot, citation, schema_label, sort_order, usfm_code, ranges)
  VALUES
    (dayid, 'note', 'From the Common of the Blessed Virgin Mary', '', 1, NULL, '[]'::jsonb);

  result := public.prayer_day_full(DATE '2026-03-01', 'roman_catholic', 'TESTV');

  ASSERT result->>'date' = '2026-03-01', 'date wrong';
  ASSERT result->>'translation' = 'TESTV', 'translation must be echoed back';
  ASSERT jsonb_array_length(result->'events') = 1, 'expected exactly 1 event';
  ASSERT jsonb_array_length(result->'events'->0->'readings') = 2, 'expected 2 readings';

  ASSERT result->'events'->0->'readings'->0->>'slot' = 'responsorial_psalm',
         'reading order wrong';
  ASSERT jsonb_array_length(result->'events'->0->'readings'->0->'verses') = 2,
         'psalm should resolve to 2 verses';
  ASSERT result->'events'->0->'readings'->0->'verses'->0->>'text' LIKE 'The LORD is my shepherd%',
         'wrong verse text';
  ASSERT result->'events'->0->'readings'->0->>'attribution' IS NOT NULL,
         'attribution must be returned for a resolved reading';

  ASSERT result->'events'->0->'readings'->1->>'slot' = 'note', 'note row missing';
  ASSERT result->'events'->0->'readings'->1->'verses' = '[]'::jsonb,
         'an unparsed citation must yield empty verses, not an error';
  ASSERT result->'events'->0->'readings'->1->>'attribution' IS NULL,
         'an unparsed citation must yield null attribution';

  -- A date with nothing imported returns an empty event list, never NULL.
  result := public.prayer_day_full(DATE '1900-01-01');
  ASSERT result IS NOT NULL, 'RPC returned NULL for an unknown date';
  ASSERT jsonb_array_length(result->'events') = 0, 'unknown date should have 0 events';
END $$;

ROLLBACK;
