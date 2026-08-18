-- Auction sources: record WHERE each fact came from, and when it was checked.
--
-- Two fields on ext_auction_sources carry real consequences and had nowhere
-- to show their working:
--
--   buyer_premium_pct feeds the Phase 3 landed-cost calculator. A number
--   sitting in that column is indistinguishable from a guess unless the page
--   it came from is recorded next to it — and a guessed premium quietly
--   distorts every estimate built on it.
--
--   The terms-of-service position decides whether a source may leave the
--   manual tier for email or API ingestion. "Reviewed and allows it" and
--   "nobody has looked yet" are very different states, and notes prose alone
--   cannot be queried for the second.
--
-- Self-hosted: record-only; apply by hand as supabase_admin.
--   ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin \
--     -d postgres -v ON_ERROR_STOP=1" < this-file.sql
--
-- Do NOT add --single-transaction; this file opens its own BEGIN/COMMIT.

BEGIN;

ALTER TABLE public.ext_auction_sources
  -- Where the premium was read from, and what it actually says. Houses
  -- routinely charge different rates online vs in the room, or add a card
  -- surcharge, so one number is always a simplification worth annotating.
  ADD COLUMN IF NOT EXISTS buyer_premium_note text,
  ADD COLUMN IF NOT EXISTS buyer_premium_source_url text,
  -- The terms page itself, plus when a human last read it.
  ADD COLUMN IF NOT EXISTS terms_url text,
  ADD COLUMN IF NOT EXISTS terms_reviewed_at timestamptz,
  -- Whether those terms permit anything beyond the manual tier. 'unreviewed'
  -- is the honest default and the reason ingest_method stays 'manual'.
  ADD COLUMN IF NOT EXISTS terms_position text NOT NULL DEFAULT 'unreviewed'
    CHECK (terms_position IN ('unreviewed','manual_only','email_ok','api_ok','prohibited')),
  -- Where a human goes to see what is coming up, and to subscribe.
  ADD COLUMN IF NOT EXISTS calendar_url text,
  ADD COLUMN IF NOT EXISTS email_alerts_url text;

COMMENT ON COLUMN public.ext_auction_sources.buyer_premium_pct IS
  'Standard buyer''s premium, percent. NULL means UNCONFIRMED — never a guess. '
  'Always record buyer_premium_source_url alongside a non-null value.';
COMMENT ON COLUMN public.ext_auction_sources.terms_position IS
  'What this house''s terms allow. Only email_ok / api_ok may leave the manual '
  'ingest tier; prohibited means automated access is refused outright.';

-- A premium without provenance is a guess wearing a number's clothes.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ext_auction_sources_premium_has_source'
  ) THEN
    ALTER TABLE public.ext_auction_sources
      ADD CONSTRAINT ext_auction_sources_premium_has_source
      CHECK (buyer_premium_pct IS NULL OR buyer_premium_source_url IS NOT NULL);
  END IF;
END $do$;

-- A source may only leave the manual tier once its terms have been read and
-- found to allow it. This is the no-scraping rule, enforced rather than
-- documented.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ext_auction_sources_ingest_needs_terms'
  ) THEN
    ALTER TABLE public.ext_auction_sources
      ADD CONSTRAINT ext_auction_sources_ingest_needs_terms
      CHECK (
        ingest_method = 'manual'
        OR (ingest_method = 'email' AND terms_position IN ('email_ok','api_ok'))
        OR (ingest_method IN ('api','feed') AND terms_position = 'api_ok')
      );
  END IF;
END $do$;

CREATE INDEX IF NOT EXISTS ext_auction_sources_terms_idx
  ON public.ext_auction_sources (terms_position);

COMMIT;

NOTIFY pgrst, 'reload schema';
