-- supabase/migrations/tests/prayer_day_full_test.sql
-- Run against a DB with 20260804120000_prayer_calendar.sql,
-- 20260804130000_prayer_bible.sql, 20260806120000_prayer_reading_text.sql,
-- 20260928120000_prayer_readings_parsed_refs.sql and
-- 20260928130000_prayer_day_full_rpc.sql applied.
--
-- Seeds its own calendar day, translation, book and verses rather than
-- depending on a real import, so this test is self-contained and repeatable.
BEGIN;

DO $$
DECLARE
  day_id uuid;
  tid    uuid;
  psa    uuid;
  isa    uuid;
  result jsonb;
BEGIN
  INSERT INTO public.gw_bible_translations (code, name, has_deuterocanon, attribution)
  VALUES ('TESTV', 'Test Version', false, 'Test Version. Public domain, for testing only.')
  RETURNING id INTO tid;

  INSERT INTO public.gw_bible_books (translation_id, usfm_code, name, canon_order, testament)
  VALUES (tid, 'PSA', 'Psalms', 19, 'OT') RETURNING id INTO psa;
  INSERT INTO public.gw_bible_books (translation_id, usfm_code, name, canon_order, testament)
  VALUES (tid, 'ISA', 'Isaiah', 23, 'OT') RETURNING id INTO isa;

  INSERT INTO public.gw_bible_verses (book_id, chapter, verse, text) VALUES
    (psa, 23, 1, 'The LORD is my shepherd; I shall lack nothing.'),
    (psa, 23, 2, 'He makes me lie down in green pastures.'),
    (isa, 2, 1, 'This is what Isaiah son of Amoz saw.'),
    (isa, 2, 2, 'It shall happen in the latter days.');

  INSERT INTO public.gw_prayer_calendar_days
    (id, rite, day_date, event_key, name, rank_grade, rank_label, color,
     liturgical_season, sunday_cycle, psalter_week)
  VALUES
    ('22222222-2222-2222-2222-222222222222', 'roman_catholic', DATE '2026-03-01',
     'TestFeria', 'Test Feria', 3, 'Weekday', ARRAY['green'],
     'ORDINARY_TIME', NULL, 4)
  RETURNING id INTO day_id;

  -- A resolvable reading: usfm_code + ranges populated, as the importer
  -- backfill would do.
  INSERT INTO public.gw_prayer_readings
    (calendar_day_id, slot, citation, schema_label, sort_order, usfm_code, ranges)
  VALUES
    (day_id, 'first_reading', 'Isaiah 2:1-2', '', 0, 'ISA',
     '[{"startChapter":2,"startVerse":1,"endChapter":2,"endVerse":2}]'::jsonb);

  -- A second resolvable reading, out of citation order, to prove sort_order
  -- (not insertion order) drives the readings array.
  INSERT INTO public.gw_prayer_readings
    (calendar_day_id, slot, citation, schema_label, sort_order, usfm_code, ranges)
  VALUES
    (day_id, 'responsorial_psalm', 'Psalm 23:1-2', '', 1, 'PSA',
     '[{"startChapter":23,"startVerse":1,"endChapter":23,"endVerse":2}]'::jsonb);

  -- An unresolvable reading (no book matched at parse time, like the "note"
  -- slot for "From the Common of..."): usfm_code stays NULL, ranges stays the
  -- column default '[]'. Must yield an empty verses array, never an error.
  INSERT INTO public.gw_prayer_readings
    (calendar_day_id, slot, citation, schema_label, sort_order)
  VALUES
    (day_id, 'note', 'From the Common of the Blessed Virgin Mary', '', 2);

  result := public.prayer_day_full(DATE '2026-03-01', 'roman_catholic', 'TESTV');

  ASSERT result->>'translation' = 'TESTV', 'translation echoed back wrong';
  ASSERT result->>'attribution' IS NOT NULL, 'attribution must be populated for a known translation';
  ASSERT jsonb_array_length(result->'events') = 1, 'expected exactly 1 event';
  ASSERT jsonb_array_length(result->'events'->0->'readings') = 3, 'expected 3 readings';

  ASSERT result->'events'->0->'readings'->0->>'slot' = 'first_reading',
         'reading order wrong: ' || (result->'events'->0->'readings'->0->>'slot');
  ASSERT jsonb_array_length(result->'events'->0->'readings'->0->'verses') = 2,
         'first_reading should resolve 2 verses';
  ASSERT result->'events'->0->'readings'->0->'verses'->0->>'text'
           = 'This is what Isaiah son of Amoz saw.',
         'wrong verse text for first_reading';

  ASSERT jsonb_array_length(result->'events'->0->'readings'->1->'verses') = 2,
         'responsorial_psalm should resolve 2 verses';

  -- The unresolvable "note" reading must degrade to an empty verses array,
  -- not NULL and not an error.
  ASSERT result->'events'->0->'readings'->2->>'slot' = 'note', 'note slot missing';
  ASSERT result->'events'->0->'readings'->2->'verses' = '[]'::jsonb,
         'unresolvable citation should yield empty verses, not error or NULL';

  -- An unknown translation degrades the same way prayer_reading_text() does:
  -- no attribution, and every reading's verses empty.
  result := public.prayer_day_full(DATE '2026-03-01', 'roman_catholic', 'NOPE');
  ASSERT result->>'attribution' IS NULL, 'unknown translation should have no attribution';
  ASSERT result->'events'->0->'readings'->0->'verses' = '[]'::jsonb,
         'unknown translation should yield empty verses, not error';

  -- A date with nothing imported returns an empty event list, never NULL.
  result := public.prayer_day_full(DATE '1900-01-01');
  ASSERT result IS NOT NULL, 'RPC returned NULL for an unknown date';
  ASSERT jsonb_array_length(result->'events') = 0, 'unknown date should have 0 events';
END $$;

ROLLBACK;
