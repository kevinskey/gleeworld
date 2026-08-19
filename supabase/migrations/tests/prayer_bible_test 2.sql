-- supabase/migrations/tests/prayer_bible_test.sql
-- Run against a DB with 20260804130000_prayer_bible.sql applied.
BEGIN;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_bible_translations','gw_bible_books','gw_bible_verses'] LOOP
    ASSERT (SELECT count(*) = 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t), t || ' missing';
    ASSERT (SELECT relrowsecurity FROM pg_class
            WHERE relname = t AND relnamespace = 'public'::regnamespace),
           t || ': RLS not enabled';
    -- Scripture is identical for every tenant: tenant-neutral on purpose.
    ASSERT (SELECT count(*) = 0 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = t
              AND column_name = 'tenant_id'),
           t || ': has tenant_id — scripture is tenant-neutral reference data';
    ASSERT (SELECT count(*) = 0 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
              AND permissive = 'RESTRICTIVE'),
           t || ': unexpected RESTRICTIVE policy on a reference table';
    ASSERT (SELECT count(*) = 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_read'),
           t || ': read policy missing';
    ASSERT (SELECT count(*) = 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
              AND policyname = t || '_admin_write'),
           t || ': admin write policy missing';
  END LOOP;

  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'gw_bible_verses_search_idx'),
         'full-text search index missing';
  ASSERT (SELECT count(*) = 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'gw_bible_verses'
            AND column_name = 'search_tsv' AND is_generated = 'ALWAYS'),
         'search_tsv must be a generated column';
END $$;

-- Behavioural checks: the unique keys and the concordance search must actually
-- work, not merely exist.
DO $$
DECLARE
  tid uuid;
  bid uuid;
  hits int;
BEGIN
  INSERT INTO public.gw_bible_translations (code, name, has_deuterocanon, attribution)
  VALUES ('TESTV', 'Test Version', true, 'test')
  RETURNING id INTO tid;

  INSERT INTO public.gw_bible_books (translation_id, usfm_code, name, canon_order, testament)
  VALUES (tid, 'GEN', 'Genesis', 1, 'OT')
  RETURNING id INTO bid;

  INSERT INTO public.gw_bible_verses (book_id, chapter, verse, text) VALUES
    (bid, 1, 1, 'In the beginning, God created the heavens and the earth.'),
    (bid, 1, 2, 'The earth was formless and empty.');

  -- Same reference twice must be rejected by the unique index.
  BEGIN
    INSERT INTO public.gw_bible_verses (book_id, chapter, verse, text)
    VALUES (bid, 1, 1, 'duplicate');
    ASSERT false, 'duplicate (book, chapter, verse) was allowed';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- The generated tsvector must support stemmed word-concordance search:
  -- searching "create" has to match "created".
  SELECT count(*) INTO hits
  FROM public.gw_bible_verses
  WHERE search_tsv @@ plainto_tsquery('english', 'create');
  ASSERT hits = 1, 'stemmed concordance search failed, got ' || hits;

  SELECT count(*) INTO hits
  FROM public.gw_bible_verses
  WHERE search_tsv @@ plainto_tsquery('english', 'earth');
  ASSERT hits = 2, 'expected 2 verses matching earth, got ' || hits;

  -- Deleting a book must cascade to its verses.
  DELETE FROM public.gw_bible_books WHERE id = bid;
  SELECT count(*) INTO hits FROM public.gw_bible_verses WHERE book_id = bid;
  ASSERT hits = 0, 'verses not cascade-deleted with their book';
END $$;

ROLLBACK;
