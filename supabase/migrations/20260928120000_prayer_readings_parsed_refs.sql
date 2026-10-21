-- Prayer module — precomputed citation parse results on gw_prayer_readings.
--
-- Phase 1 (docs/superpowers/plans/2026-08-04-prayer-phase1.md), completing
-- Task 3. The plan's stated architecture is "citation parsing lives in
-- exactly one place" (src/lib/prayer/citation.ts). That only holds if the
-- parse happens once, at import time, in Node/TypeScript — not again inside
-- an edge function.
--
-- Edge functions deploy by copying each function's own directory to
-- /opt/supabase/volumes/functions/<name>/ on the droplet (see
-- docs/superpowers/plans/2026-08-17-music-library-limits.md); nothing outside
-- supabase/functions/ ships with them. There is no precedent anywhere in this
-- repo of an edge function importing from src/lib, and citation.ts cannot be
-- deployed that way. So prayer_day_full() (next migration) must not need to
-- parse citation strings itself — it can only look up verses for ranges that
-- were already resolved.
--
-- These three columns hold that precomputed result per reading row:
--   usfm_code         — the book src/lib/prayer/citation.ts resolved, or NULL
--                        if the citation had no resolvable book (e.g. the
--                        "note" slot's "From the Common of the Blessed
--                        Virgin Mary").
--   ranges            — VerseRange[] as JSON, ready to pass straight into
--                        prayer_reading_text()'s p_ranges argument.
--   unparsed_segments — any citation fragments the parser could not read
--                        (e.g. the corpus's "3b4" typo), kept for visibility
--                        rather than silently dropped.
--
-- Nullable/defaulted so existing rows remain valid until the importer
-- backfills them; prayer_day_full() treats a NULL/empty usfm_code or ranges
-- as "no text available" and returns an empty verses array for that reading,
-- same as an unresolvable citation.

ALTER TABLE public.gw_prayer_readings
  ADD COLUMN IF NOT EXISTS usfm_code         text,
  ADD COLUMN IF NOT EXISTS ranges            jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS unparsed_segments text[] NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
