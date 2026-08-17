-- supabase/migrations/tests/prayer_day_full_test.sql
-- Run against a DB with 20260804120000_prayer_calendar.sql,
-- 20260804130000_prayer_bible.sql, 20260806120000_prayer_reading_text.sql,
-- 20260817120000_prayer_reading_ranges.sql and
-- 20260817130000_prayer_day_full.sql applied.
--
-- Seeds its own translation/book/verses, matching prayer_reading_text_test.sql,
-- so this test does not depend on a real WEBCE import.
BEGIN;

DO $$
DECLARE
  tid    uuid;
  bid    uuid;
  did    uuid;
  result jsonb;
BEGIN
  INSERT INTO public.gw_bible_translations (code, name, has_deuterocanon, attribution)
  VALUES ('TESTV', 'Test Version', false, 'Test Version. Public domain, for testing only.')
  RETURNING id INTO tid;

  INSERT INTO public.gw_bible_books (translation_id, usfm_code, name, canon_order, testament)
  VALUES (tid, 'ISA', 'Isaiah', 23, 'OT') RETURNING id INTO bid;

  INSERT INTO public.gw_bible_verses (book_id, chapter, verse, text) VALUES
    (bid, 2, 1, 'This is the word that Isaiah the son of Amoz saw.'),
    (bid, 2, 2, 'It shall happen in the latter days.');

  INSERT INTO public.gw_prayer_calendar_days
    (id, rite, day_date, event_key, name, rank_grade, liturgical_season)
  VALUES
    ('22222222-2222-2222-2222-222222222222', 'roman_catholic', DATE '2099-02-02',
     'FullTestDay', 'Full Test Day', 3, 'ORDINARY_TIME')
  RETURNING id INTO did;

  INSERT INTO public.gw_prayer_readings
    (calendar_day_id, slot, citation, schema_label, sort_order, parsed_citation)
  VALUES
    (did, 'first_reading', 'Isaiah 2:1-2', '', 0,
     '{"usfmCode":"ISA","ranges":[{"startChapter":2,"startVerse":1,"endChapter":2,"endVerse":2}],"unparsed":[]}'::jsonb),
    (did, 'gospel', 'Some Unparsed Citation', '', 1,
     '{"usfmCode":null,"ranges":[],"unparsed":["Some Unparsed Citation"]}'::jsonb);

  result := public.prayer_day_full(DATE '2099-02-02', 'roman_catholic', 'TESTV');

  ASSERT result->>'date' = '2099-02-02', 'date wrong: ' || coalesce(result->>'date', '<null>');
  ASSERT result->>'translation' = 'TESTV', 'translation wrong';
  ASSERT jsonb_array_length(result->'events') = 1, 'expected 1 event';
  ASSERT jsonb_array_length(result->'events'->0->'readings') = 2, 'expected 2 readings';

  ASSERT result->'events'->0->'readings'->0->>'slot' = 'first_reading', 'reading order wrong';
  ASSERT jsonb_array_length(result->'events'->0->'readings'->0->'verses') = 2,
         'expected 2 resolved verses for the first reading, got ' ||
         jsonb_array_length(result->'events'->0->'readings'->0->'verses');
  ASSERT result->'events'->0->'readings'->0->'verses'->0->>'text' LIKE 'This is the word%',
         'wrong verse text resolved: ' ||
         coalesce(result->'events'->0->'readings'->0->'verses'->0->>'text', '<null>');
  ASSERT result->'events'->0->'readings'->0->>'attribution' IS NOT NULL,
         'attribution must be present when verses resolve';

  -- A reading whose citation never parsed must degrade to an empty verses
  -- array, never NULL and never an error.
  ASSERT result->'events'->0->'readings'->1->>'slot' = 'gospel', 'second reading order wrong';
  ASSERT result->'events'->0->'readings'->1->'verses' = '[]'::jsonb,
         'unparsed citation should yield empty verses, not error';

  -- Unknown date returns an empty event list, matching prayer_day()'s contract.
  result := public.prayer_day_full(DATE '1900-01-01');
  ASSERT result IS NOT NULL, 'RPC returned NULL for an unknown date';
  ASSERT jsonb_array_length(result->'events') = 0, 'unknown date should have 0 events';
END $$;

ROLLBACK;
