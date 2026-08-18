-- Say when we do not actually know the time of day.
--
-- GSA publishes auction DATES with no clock time. The loader stores them at
-- 12:00Z so the calendar lands on the right day in every US timezone — but
-- the card then rendered "Opens Aug 10, 8:00 AM", which is a time nobody
-- published. On a product whose whole pitch is telling a buyer when to act,
-- inventing a clock time is the wrong kind of wrong.
--
-- With this flag the UI shows the date alone for such rows, and keeps showing
-- real times where a house actually published one.
--
-- Self-hosted: record-only; apply by hand as supabase_admin, WITHOUT
-- --single-transaction (this file opens its own BEGIN/COMMIT).

BEGIN;

ALTER TABLE public.ext_auctions
  ADD COLUMN IF NOT EXISTS times_are_estimated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ext_auctions.times_are_estimated IS
  'True when the source gave a date but no clock time, so opens_at/closes_at '
  'carry a placeholder time. The UI must render the date alone for these.';

-- Everything currently loaded came from the GSA feed, which is date-only.
UPDATE public.ext_auctions a
   SET times_are_estimated = true
  FROM public.ext_auction_sources s
 WHERE s.id = a.source_id
   AND s.slug = 'gsa-auctions';

-- The GSA rows arrived through their official public API, not by hand. Their
-- terms permit it (terms_position = 'api_ok'), which is what the CHECK on
-- ingest_method requires, so the provenance line can now say so honestly
-- instead of claiming "entered by hand".
UPDATE public.ext_auction_sources
   SET ingest_method = 'api'
 WHERE slug = 'gsa-auctions'
   AND terms_position = 'api_ok';

COMMIT;

NOTIFY pgrst, 'reload schema';
