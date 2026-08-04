-- Prayer module — liturgical calendar + Mass reading citations.
--
-- PLATFORM REFERENCE DATA. Unlike almost every other gw_ table, these have
-- NO tenant_id: the Roman calendar is identical for every tenant, so copying
-- 365 rows/year per tenant would be pure waste and a consistency hazard.
-- Readable by every authenticated user; writable only by super_admin.
--
-- Source: LiturgicalCalendarAPI (Apache-2.0), national calendar US.
-- `rite` exists so an RCL/devotional track can be added later without a
-- schema change.

-- Super-admin-only predicate for the Prayer reference tables.
-- Mirrors the house pattern in 20260803120000_excuse_form_settings.sql but
-- WITHOUT is_admin: tenant admins must not be able to edit the Roman calendar.
-- Accepts the boolean column and both role spellings.
CREATE OR REPLACE FUNCTION public.gw_is_platform_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles p
     WHERE p.user_id = auth.uid()
       AND (p.is_super_admin OR p.role IN ('super_admin', 'super-admin'))
  );
$$;

CREATE TABLE IF NOT EXISTS public.gw_prayer_calendar_days (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rite                      text NOT NULL DEFAULT 'roman_catholic'
                              CHECK (rite IN ('roman_catholic','rcl','devotional')),
  day_date                  date NOT NULL,
  event_key                 text NOT NULL,
  name                      text NOT NULL,
  rank_grade                int,
  rank_label                text,
  color                     text[] NOT NULL DEFAULT '{}',
  liturgical_season         text,
  sunday_cycle              char(1) CHECK (sunday_cycle IN ('A','B','C')),
  -- LitCal does not expose the weekday (ferial) cycle, so the importer leaves
  -- this NULL. Phase 1 derives it: Cycle I in odd-numbered liturgical years,
  -- Cycle II in even. Column exists now so that backfill needs no migration.
  weekday_cycle             char(1) CHECK (weekday_cycle IN ('I','II')),
  psalter_week              int,
  is_holy_day_of_obligation boolean NOT NULL DEFAULT false,
  source                    text NOT NULL DEFAULT 'litcal',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS gw_prayer_calendar_days_rite_date_key_uidx
  ON public.gw_prayer_calendar_days (rite, day_date, event_key);

CREATE INDEX IF NOT EXISTS gw_prayer_calendar_days_rite_date_idx
  ON public.gw_prayer_calendar_days (rite, day_date);

CREATE TABLE IF NOT EXISTS public.gw_prayer_readings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_day_id uuid NOT NULL
                    REFERENCES public.gw_prayer_calendar_days(id) ON DELETE CASCADE,
  -- first_reading | responsorial_psalm | second_reading | gospel_acclamation |
  -- gospel | palm_gospel | epistle | third_reading … seventh_reading, etc.
  slot            text NOT NULL,
  citation        text NOT NULL,
  -- Christmas night/dawn/day, Pentecost Vigil schema_one/two/three, else ''.
  schema_label    text NOT NULL DEFAULT '',
  sort_order      int  NOT NULL DEFAULT 0,
  -- Provenance. The calendar and the readings come from DIFFERENT upstream
  -- projects: LitCal's calendar is complete but its citations are blank on
  -- 28-50% of dates per year, so citations come from catholic-readings-api
  -- (MIT, citations only — no scripture text), measured at 365/365 for 2026.
  -- Both licenses require attribution, so the row records which one it came from.
  source          text NOT NULL DEFAULT 'catholic-readings-api'
);

CREATE UNIQUE INDEX IF NOT EXISTS gw_prayer_readings_day_slot_uidx
  ON public.gw_prayer_readings (calendar_day_id, slot, schema_label);

CREATE INDEX IF NOT EXISTS gw_prayer_readings_day_idx
  ON public.gw_prayer_readings (calendar_day_id);

ALTER TABLE public.gw_prayer_calendar_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_prayer_readings      ENABLE ROW LEVEL SECURITY;

-- Reference data: everyone signed in may read.
CREATE POLICY gw_prayer_calendar_days_read ON public.gw_prayer_calendar_days
  FOR SELECT TO authenticated USING (true);
CREATE POLICY gw_prayer_readings_read ON public.gw_prayer_readings
  FOR SELECT TO authenticated USING (true);

-- Only platform super-admins may write.
CREATE POLICY gw_prayer_calendar_days_admin_write ON public.gw_prayer_calendar_days
  FOR ALL TO authenticated
  USING (public.gw_is_platform_super_admin())
  WITH CHECK (public.gw_is_platform_super_admin());
CREATE POLICY gw_prayer_readings_admin_write ON public.gw_prayer_readings
  FOR ALL TO authenticated
  USING (public.gw_is_platform_super_admin())
  WITH CHECK (public.gw_is_platform_super_admin());

NOTIFY pgrst, 'reload schema';
