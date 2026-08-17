-- Prayer module — store each reading's parsed citation alongside its raw text.
--
-- Phase 1 (docs/superpowers/plans/2026-08-04-prayer-phase1.md), completing
-- Task 3. Citation parsing ("Isaiah 2:1-5" -> book + verse ranges) lives in
-- exactly one place, src/lib/prayer/citation.ts, so it is computed once by
-- the import script (scripts/import-prayer-calendar.ts) and stored here.
-- prayer_day_full() (20260817130000) reads this column to join straight to
-- gw_bible_verses without a second, SQL-side reimplementation of the parser.
--
-- Shape mirrors the TypeScript ParsedCitation type:
--   { usfmCode: string|null, ranges: VerseRange[], unparsed: string[] }
-- A citation that fails to resolve a book, or fails to import at all yet,
-- still has a well-formed default so callers never see NULL.
--
-- gw_prayer_readings is one of the deliberately tenant-less reference tables
-- (see 20260804120000_prayer_calendar.sql); this migration only adds a
-- column and does not touch its RLS policies or tenant-neutral shape.

ALTER TABLE public.gw_prayer_readings
  ADD COLUMN IF NOT EXISTS parsed_citation jsonb NOT NULL
    DEFAULT '{"usfmCode": null, "ranges": [], "unparsed": []}'::jsonb;

NOTIFY pgrst, 'reload schema';
