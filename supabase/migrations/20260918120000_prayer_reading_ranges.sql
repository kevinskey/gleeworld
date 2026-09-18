-- Prayer module — pre-parsed verse ranges on each reading citation.
--
-- Phase 1 (docs/superpowers/plans/2026-08-04-prayer-phase1.md) needs to turn a
-- citation string ("Acts 7:51—8:1a") into (book, chapter, verse) ranges before
-- it can select from gw_bible_verses. That parser is src/lib/prayer/citation.ts
-- — pure TypeScript, unit-tested against the real 1,165-citation corpus — and
-- the plan's own architecture note is that citation parsing "lives in exactly
-- one place."
--
-- That one place is the Node/tsx import script
-- (scripts/import-prayer-calendar.ts), which already imports this module
-- successfully. There is no precedent anywhere in this codebase for a
-- deployed Supabase Edge Function reaching outside supabase/functions/ to
-- import from src/lib/ — every existing relative edge-function import stays
-- inside supabase/functions/ and always carries an explicit .ts extension —
-- and whether that would even resolve at deploy time is not verifiable from
-- a sandboxed session with no live deploy access. Parsing once at import
-- time and storing the result removes that unverified assumption entirely:
-- prayer_day_full() (see 20260918121500_prayer_day_full_rpc.sql) does a
-- plain SQL join, with no edge-function-side dependency on this parser.
--
-- usfm_code/ranges are NULL / '[]' for a citation the parser could not read
-- (e.g. a "note" row like "From the Common of the Blessed Virgin Mary", or a
-- letter-chapter reference such as Esther's Greek additions) — consumers
-- treat that the same as "no verse text available yet" and still show the
-- citation string. Existing rows get these columns via a re-run of
-- scripts/import-prayer-calendar.ts (idempotent, upserts by
-- (calendar_day_id, slot, schema_label)); this migration only adds the
-- columns.

ALTER TABLE public.gw_prayer_readings
  ADD COLUMN IF NOT EXISTS usfm_code text,
  ADD COLUMN IF NOT EXISTS ranges    jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.gw_prayer_readings.usfm_code IS
  'Resolved by src/lib/prayer/citation.ts at import time. NULL when the citation could not be parsed to a single book.';
COMMENT ON COLUMN public.gw_prayer_readings.ranges IS
  'VerseRange[] from src/lib/prayer/citation.ts (camelCase keys: startChapter/startVerse/endChapter/endVerse/chapterLabel), consumed directly by prayer_reading_text(). Empty array when unparsed.';

NOTIFY pgrst, 'reload schema';
