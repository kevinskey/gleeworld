-- supabase/migrations/tests/prayer_reading_text_test.sql
-- Run against a DB with 20260804130000_prayer_bible.sql and
-- 20260806120000_prayer_reading_text.sql applied.
--
-- Seeds its own translation/book/verses rather than depending on a real WEBCE
-- import (that happens via scripts/import-webce.mjs, outside migrations), so
-- this test is self-contained and repeatable.
BEGIN;

DO $$
DECLARE
  tid  uuid;
  psa  uuid; -- Psalms: chapters 22 and 23, to exercise a within-book,
             -- cross-chapter-shaped range as well as a plain one.
  act  uuid; -- Acts: chapters 7 and 8, to exercise a real cross-chapter range.
  r    jsonb;
BEGIN
  INSERT INTO public.gw_bible_translations (code, name, has_deuterocanon, attribution)
  VALUES ('TESTV', 'Test Version', false, 'Test Version. Public domain, for testing only.')
  RETURNING id INTO tid;

  INSERT INTO public.gw_bible_books (translation_id, usfm_code, name, canon_order, testament)
  VALUES (tid, 'PSA', 'Psalms', 19, 'OT') RETURNING id INTO psa;
  INSERT INTO public.gw_bible_books (translation_id, usfm_code, name, canon_order, testament)
  VALUES (tid, 'ACT', 'Acts', 44, 'NT') RETURNING id INTO act;

  INSERT INTO public.gw_bible_verses (book_id, chapter, verse, text) VALUES
    (psa, 23, 1, 'The LORD is my shepherd; I shall lack nothing.'),
    (psa, 23, 2, 'He makes me lie down in green pastures.'),
    (psa, 23, 3, 'He restores my soul.');

  INSERT INTO public.gw_bible_verses (book_id, chapter, verse, text) VALUES
    (act, 7, 58, 'They threw him out of the city and stoned him.'),
    (act, 7, 59, 'They stoned Stephen as he called out.'),
    (act, 7, 60, 'He fell asleep.'),
    (act, 8, 1,  'Saul was consenting to his death.'),
    (act, 8, 2,  'Devout men buried Stephen.');

  -- A simple within-chapter range.
  r := public.prayer_reading_text('TESTV', 'PSA',
        '[{"startChapter":23,"startVerse":1,"endChapter":23,"endVerse":1}]'::jsonb);
  ASSERT jsonb_array_length(r->'verses') = 1, 'expected 1 verse, got ' || jsonb_array_length(r->'verses');
  ASSERT r->'verses'->0->>'text' LIKE 'The LORD is my shepherd%',
         'wrong verse text: ' || coalesce(r->'verses'->0->>'text', '<null>');
  ASSERT r->>'attribution' IS NOT NULL, 'attribution must be returned';
  ASSERT r->>'translation' = 'TESTV', 'translation code must be echoed back';

  -- A cross-chapter range must span the boundary (7:59 through 8:1 => three verses).
  r := public.prayer_reading_text('TESTV', 'ACT',
        '[{"startChapter":7,"startVerse":59,"endChapter":8,"endVerse":1}]'::jsonb);
  ASSERT jsonb_array_length(r->'verses') = 3,
         'cross-chapter range: expected 3 verses, got ' || jsonb_array_length(r->'verses');
  ASSERT r->'verses'->0->>'chapter' = '7' AND r->'verses'->2->>'chapter' = '8',
         'cross-chapter range did not span the chapter boundary';

  -- Multiple disjoint ranges (comma-segment citations) must union, not overwrite.
  r := public.prayer_reading_text('TESTV', 'PSA',
        '[{"startChapter":23,"startVerse":1,"endChapter":23,"endVerse":1},
          {"startChapter":23,"startVerse":3,"endChapter":23,"endVerse":3}]'::jsonb);
  ASSERT jsonb_array_length(r->'verses') = 2,
         'disjoint ranges: expected 2 verses, got ' || jsonb_array_length(r->'verses');

  -- A letter-labelled chapter (Esther's Greek additions) has no numeric
  -- chapter to resolve against gw_bible_verses; it must be dropped, not error.
  r := public.prayer_reading_text('TESTV', 'PSA',
        '[{"startChapter":null,"startVerse":12,"endChapter":null,"endVerse":12,"chapterLabel":"C"}]'::jsonb);
  ASSERT r->'verses' = '[]'::jsonb, 'letter-chapter range should resolve to no verses, not error';

  -- Unknown book returns empty, never null, and never throws.
  r := public.prayer_reading_text('TESTV', 'NOPE', '[]'::jsonb);
  ASSERT r IS NOT NULL, 'RPC returned NULL for an unknown book';
  ASSERT r->'verses' = '[]'::jsonb, 'unknown book should yield []';

  -- Unknown translation likewise degrades gracefully.
  r := public.prayer_reading_text('NOPE', 'PSA', '[]'::jsonb);
  ASSERT r->'verses' = '[]'::jsonb, 'unknown translation should yield []';
  ASSERT r->>'attribution' IS NULL, 'unknown translation should have no attribution';
END $$;

ROLLBACK;
