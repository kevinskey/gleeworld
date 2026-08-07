-- Keep every set of readings a day offers, and let the plan choose one.
--
-- Some days publish more than one set and USCCB serves the plain date URL as a
-- page of links: Christmas (Vigil, Night, Dawn, Day), the Assumption, Pentecost,
-- the Lenten Sundays (the cycle's own readings beside the Year A scrutiny set),
-- and — the case that forced this — the Ascension.
--
-- Ascension is a provincial decision. Where it stays on Thursday, that Thursday
-- is The Ascension of the Lord and the following Sunday is the Seventh Sunday of
-- Easter. Where it is transferred, the Thursday is an ordinary weekday and the
-- Sunday is the Ascension. USCCB publishes both sets on both dates and expects
-- the reader to know which applies. The backfill was picking one arbitrarily,
-- which silently gave Atlanta the wrong readings for two dates.
--
-- No default can be right for every tenant, so store all of them and let the
-- plan record its choice.

ALTER TABLE public.usccb_readings
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS variant_rank  integer;

COMMENT ON COLUMN public.usccb_readings.variant_label IS
  'Which Mass these readings are for on a day that offers several (e.g. "Mass '
  'during the Day", "The Ascension of the Lord"). NULL when the day has only one.';
COMMENT ON COLUMN public.usccb_readings.variant_rank IS
  'Suggested order; 0 is the one offered first. Advisory, never authoritative — '
  'the correct variant depends on the diocese.';

-- A day can now hold several rows, so the key has to include the variant.
-- COALESCE keeps single-set days keyed exactly as before: their NULL label
-- collapses to '' rather than defeating uniqueness the way bare NULLs would.
ALTER TABLE public.usccb_readings
  DROP CONSTRAINT IF EXISTS usccb_readings_day_cycle_key;

CREATE UNIQUE INDEX IF NOT EXISTS usccb_readings_day_cycle_variant_key
  ON public.usccb_readings (liturgical_day, year_cycle, COALESCE(variant_label, ''));

-- Which set this plan uses. NULL means "whatever the day offers first", which
-- is right for the overwhelming majority of days that offer only one.
ALTER TABLE public.gw_liturgy_masses
  ADD COLUMN IF NOT EXISTS readings_variant text;

COMMENT ON COLUMN public.gw_liturgy_masses.readings_variant IS
  'Chosen usccb_readings.variant_label for days with more than one set of '
  'readings. NULL = the first one offered.';
