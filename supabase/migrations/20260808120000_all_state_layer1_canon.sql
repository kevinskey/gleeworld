-- All-State module — Layer 1: global editorial canon.
--
-- Nine tenantless tables owned by GleeWorld staff, publicly readable once
-- verified. This is reference data about state music associations (Georgia's
-- GMEA and eventually the other 50), NOT tenant data. A director in any tenant
-- reads the same Georgia rows.
--
-- THREE THINGS THAT MAKE THIS DIFFERENT FROM A NORMAL gw_ TABLE
--
-- 1. NO tenant_id, deliberately. All ten tables have been added to the global
--    whitelist arrays in migrations/phase1_tenants.sql and
--    phase2_rls_rollout.sql as part of this change. Those scripts are one-shot
--    and already ran, so nothing will retroactively bolt a tenant_id on today
--    — the whitelist edit protects whoever re-runs them next. Without it,
--    phase2 would try to create a tenant_isolation_restrict policy referencing
--    a nonexistent tenant_id column and abort the entire script.
--
-- 2. Writes are gated on is_platform_owner() (20260708030000), NOT on
--    app_roles. The existing global editorial table, usccb_readings, gates on
--    app_roles — which is itself global and un-tenanted, so ANY tenant's admin
--    can write it. That is a bug, not a pattern to copy.
--
-- 3. anon can SELECT, but only rows that are actually verified. Unverified
--    scraped or draft data must never reach a public page. Same shape as
--    gw_event_merch_items' publish gate (20260804190000).
--
-- SEASON IS PART OF IDENTITY. georgia-hs-mixed-2026-27 and
-- georgia-hs-mixed-2025-26 are two rows, not one row updated in place, so
-- rolling to a new season leaves last season fully intact and readable.
-- lineage_key chains successive seasons of the same program for year-over-year
-- diffing.
--
-- COPYRIGHT: gw_all_state_repertoire holds factual metadata only — title,
-- composer, publisher, catalog number. Never scores, never excerpts, never
-- lyrics.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- Shared enum-ish CHECKs are inlined rather than CREATE TYPE: the repo's
-- history shows enums get painful to alter (voice_part_enum was created then
-- dropped for a text column, 20250801040112).
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gw_all_state_states (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  abbreviation text NOT NULL UNIQUE CHECK (abbreviation ~ '^[A-Z]{2}$'),
  slug         text NOT NULL UNIQUE,
  region       text,
  active       boolean NOT NULL DEFAULT false,   -- flips true when a state has real data
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gw_all_state_organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id    uuid NOT NULL REFERENCES public.gw_all_state_states(id) ON DELETE CASCADE,
  name        text NOT NULL,
  acronym     text,
  website_url text,
  logo_url    text,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state_id, name)
);
CREATE INDEX IF NOT EXISTS idx_gw_as_orgs_state ON public.gw_all_state_organizations(state_id);

CREATE TABLE IF NOT EXISTS public.gw_all_state_programs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id            uuid NOT NULL REFERENCES public.gw_all_state_states(id) ON DELETE CASCADE,
  organization_id     uuid REFERENCES public.gw_all_state_organizations(id) ON DELETE SET NULL,
  name                text NOT NULL,
  slug                text NOT NULL UNIQUE,          -- e.g. georgia-hs-mixed-2026-27
  season              text NOT NULL,                 -- e.g. '2026-27'
  lineage_key         text NOT NULL,                 -- e.g. georgia-hs-mixed — stable across seasons
  school_level        text CHECK (school_level IN ('elementary','middle','high','collegiate','other') OR school_level IS NULL),
  ensemble_type       text,                          -- mixed / treble / tenor-bass / jazz — state's own wording
  description         text,
  active              boolean NOT NULL DEFAULT true,
  verification_status text NOT NULL DEFAULT 'draft'
                      CHECK (verification_status IN ('draft','pending_verification','verified','stale')),
  verified_at         timestamptz,
  verified_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lineage_key, season)
);
CREATE INDEX IF NOT EXISTS idx_gw_as_programs_state   ON public.gw_all_state_programs(state_id);
CREATE INDEX IF NOT EXISTS idx_gw_as_programs_lineage ON public.gw_all_state_programs(lineage_key, season);
CREATE INDEX IF NOT EXISTS idx_gw_as_programs_public
  ON public.gw_all_state_programs(state_id) WHERE verification_status = 'verified';

-- Sources are declared here (not in Phase 4) so that hand-entered Georgia data
-- can carry real provenance from day one. The crawler tables come later and
-- will reference these same rows.
CREATE TABLE IF NOT EXISTS public.gw_all_state_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id        uuid REFERENCES public.gw_all_state_states(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.gw_all_state_organizations(id) ON DELETE SET NULL,
  name            text NOT NULL,
  domain          text,
  url             text NOT NULL,
  source_type     text CHECK (source_type IN ('official','handbook_pdf','calendar','news','other') OR source_type IS NULL),
  trust_level     text NOT NULL DEFAULT 'official'
                  CHECK (trust_level IN ('official','trusted','unverified')),
  active          boolean NOT NULL DEFAULT true,
  retrieved_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_as_sources_state ON public.gw_all_state_sources(state_id);

-- Every published external fact carries provenance. confidence lets a
-- hand-entered-but-unconfirmed value be shown differently from a verified one.
CREATE TABLE IF NOT EXISTS public.gw_all_state_dates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  uuid NOT NULL REFERENCES public.gw_all_state_programs(id) ON DELETE CASCADE,
  date_type   text NOT NULL,        -- registration_deadline / audition_round / event / results ...
  title       text NOT NULL,
  start_at    timestamptz,
  end_at      timestamptz,
  -- States routinely publish a deadline as a bare date with no clock time
  -- (GMEA's entire 2026-27 calendar does exactly this). Storing that as
  -- midnight and rendering "12:00 AM" invents precision the source never
  -- gave, and a director reading "12:00 AM Sept 15" may reasonably conclude
  -- the deadline is the START of the 15th. all_day suppresses the time.
  all_day     boolean NOT NULL DEFAULT false,
  timezone    text NOT NULL DEFAULT 'America/New_York',
  description text,
  source_id   uuid REFERENCES public.gw_all_state_sources(id) ON DELETE SET NULL,
  source_url  text,
  retrieved_at timestamptz,
  confidence  text NOT NULL DEFAULT 'unverified'
              CHECK (confidence IN ('verified','official_source','unverified')),
  sort_order  int NOT NULL DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_as_dates_program ON public.gw_all_state_dates(program_id, start_at);

-- structured_data carries per-category shape (e.g. scale lists, recording specs)
-- without a column explosion. The task generator reads these rows, which is what
-- lets a new state ship with zero code changes.
CREATE TABLE IF NOT EXISTS public.gw_all_state_requirements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      uuid NOT NULL REFERENCES public.gw_all_state_programs(id) ON DELETE CASCADE,
  category        text NOT NULL,      -- eligibility / materials / recording / scales / sight_reading / membership
  title           text NOT NULL,
  description     text,
  structured_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order      int NOT NULL DEFAULT 100,
  source_id       uuid REFERENCES public.gw_all_state_sources(id) ON DELETE SET NULL,
  source_url      text,
  retrieved_at    timestamptz,
  confidence      text NOT NULL DEFAULT 'unverified'
                  CHECK (confidence IN ('verified','official_source','unverified')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_as_reqs_program ON public.gw_all_state_requirements(program_id, sort_order);

CREATE TABLE IF NOT EXISTS public.gw_all_state_repertoire (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id     uuid NOT NULL REFERENCES public.gw_all_state_programs(id) ON DELETE CASCADE,
  title          text NOT NULL,
  composer       text,
  arranger       text,
  publisher      text,
  catalog_number text,
  voicing        text,
  purpose        text,           -- audition / performance
  movement       text,
  notes          text,
  source_id      uuid REFERENCES public.gw_all_state_sources(id) ON DELETE SET NULL,
  source_url     text,
  retrieved_at   timestamptz,
  sort_order     int NOT NULL DEFAULT 100,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_as_rep_program ON public.gw_all_state_repertoire(program_id, sort_order);
COMMENT ON TABLE public.gw_all_state_repertoire IS
  'Factual bibliographic metadata only. Never store scores, excerpts, or lyrics.';

-- payable_to is the load-bearing column: it distinguishes a fee owed to the
-- state association (which GleeWorld only displays) from one the director
-- collects (which routes through the existing gw_student_fees rail). It must
-- never imply a checkout GleeWorld does not own.
CREATE TABLE IF NOT EXISTS public.gw_all_state_fees (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id   uuid NOT NULL REFERENCES public.gw_all_state_programs(id) ON DELETE CASCADE,
  fee_type     text NOT NULL,          -- audition / participation / late
  amount_cents int CHECK (amount_cents >= 0),
  currency     text NOT NULL DEFAULT 'usd',
  payable_to   text NOT NULL DEFAULT 'state_association'
               CHECK (payable_to IN ('state_association','director','school','unknown')),
  description  text,
  source_id    uuid REFERENCES public.gw_all_state_sources(id) ON DELETE SET NULL,
  source_url   text,
  retrieved_at timestamptz,
  confidence   text NOT NULL DEFAULT 'unverified'
               CHECK (confidence IN ('verified','official_source','unverified')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_as_fees_program ON public.gw_all_state_fees(program_id);

CREATE TABLE IF NOT EXISTS public.gw_all_state_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    uuid NOT NULL REFERENCES public.gw_all_state_programs(id) ON DELETE CASCADE,
  title         text NOT NULL,
  document_type text,               -- handbook / rules / form / calendar
  url           text NOT NULL,
  published_at  timestamptz,
  retrieved_at  timestamptz,
  source_id     uuid REFERENCES public.gw_all_state_sources(id) ON DELETE SET NULL,
  sort_order    int NOT NULL DEFAULT 100,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_as_docs_program ON public.gw_all_state_documents(program_id, sort_order);

-- The STATE's voice parts, which will not always match a tenant's section
-- labels. Georgia happens to use SI..BII, which maps near-1:1 onto GleeWorld's
-- gw_profiles.voice_part CHECK (S1,S2,A1,A2,T1,T2,B1,B2) — but that is luck,
-- not a rule, so the mapping table in Layer 3 still earns its place.
CREATE TABLE IF NOT EXISTS public.gw_all_state_voice_parts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.gw_all_state_programs(id) ON DELETE CASCADE,
  code       text NOT NULL,
  label      text NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, code)
);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: anon + authenticated read verified rows; only platform owner writes.
--
-- Read gating differs by table. Programs gate on their own
-- verification_status; children gate on their parent program's. States and
-- organizations are harmless skeletons (names and abbreviations), so they are
-- readable unconditionally — otherwise the 50-state directory page would be
-- blank until every state is populated.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_all_state_states','gw_all_state_organizations','gw_all_state_programs',
    'gw_all_state_sources','gw_all_state_dates','gw_all_state_requirements',
    'gw_all_state_repertoire','gw_all_state_fees','gw_all_state_documents',
    'gw_all_state_voice_parts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Staff write. is_platform_owner() = super-admin whose JWT tenant_slug is
    -- 'main'; false for every tenant admin, including tenant super-admins.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_staff_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner())',
      t || '_staff_write', t);

    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- Skeleton tables: readable by everyone.
CREATE POLICY gw_all_state_states_public_read
  ON public.gw_all_state_states FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY gw_all_state_organizations_public_read
  ON public.gw_all_state_organizations FOR SELECT TO anon, authenticated USING (true);

-- Programs: only verified ones are public.
CREATE POLICY gw_all_state_programs_public_read
  ON public.gw_all_state_programs FOR SELECT TO anon, authenticated
  USING (verification_status = 'verified');

-- Children inherit their program's publish gate.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_all_state_dates','gw_all_state_requirements','gw_all_state_repertoire',
    'gw_all_state_fees','gw_all_state_documents','gw_all_state_voice_parts'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated '
      'USING (EXISTS (SELECT 1 FROM public.gw_all_state_programs p '
      '                WHERE p.id = %I.program_id '
      '                  AND p.verification_status = ''verified''))',
      t || '_public_read', t, t);
  END LOOP;
END $$;

-- Sources are provenance, shown next to published facts, so they are readable.
CREATE POLICY gw_all_state_sources_public_read
  ON public.gw_all_state_sources FOR SELECT TO anon, authenticated USING (true);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Seed all 51 jurisdictions as skeleton rows. active=false until a state has
-- real, verified data — the directory page uses that to show "coming soon".
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_states (name, abbreviation, slug, region) VALUES
  ('Alabama','AL','alabama','South'),               ('Alaska','AK','alaska','West'),
  ('Arizona','AZ','arizona','West'),                ('Arkansas','AR','arkansas','South'),
  ('California','CA','california','West'),          ('Colorado','CO','colorado','West'),
  ('Connecticut','CT','connecticut','Northeast'),   ('Delaware','DE','delaware','Northeast'),
  ('District of Columbia','DC','district-of-columbia','Northeast'),
  ('Florida','FL','florida','South'),               ('Georgia','GA','georgia','South'),
  ('Hawaii','HI','hawaii','West'),                  ('Idaho','ID','idaho','West'),
  ('Illinois','IL','illinois','Midwest'),           ('Indiana','IN','indiana','Midwest'),
  ('Iowa','IA','iowa','Midwest'),                   ('Kansas','KS','kansas','Midwest'),
  ('Kentucky','KY','kentucky','South'),             ('Louisiana','LA','louisiana','South'),
  ('Maine','ME','maine','Northeast'),               ('Maryland','MD','maryland','Northeast'),
  ('Massachusetts','MA','massachusetts','Northeast'),('Michigan','MI','michigan','Midwest'),
  ('Minnesota','MN','minnesota','Midwest'),         ('Mississippi','MS','mississippi','South'),
  ('Missouri','MO','missouri','Midwest'),           ('Montana','MT','montana','West'),
  ('Nebraska','NE','nebraska','Midwest'),           ('Nevada','NV','nevada','West'),
  ('New Hampshire','NH','new-hampshire','Northeast'),('New Jersey','NJ','new-jersey','Northeast'),
  ('New Mexico','NM','new-mexico','West'),          ('New York','NY','new-york','Northeast'),
  ('North Carolina','NC','north-carolina','South'), ('North Dakota','ND','north-dakota','Midwest'),
  ('Ohio','OH','ohio','Midwest'),                   ('Oklahoma','OK','oklahoma','South'),
  ('Oregon','OR','oregon','West'),                  ('Pennsylvania','PA','pennsylvania','Northeast'),
  ('Rhode Island','RI','rhode-island','Northeast'), ('South Carolina','SC','south-carolina','South'),
  ('South Dakota','SD','south-dakota','Midwest'),   ('Tennessee','TN','tennessee','South'),
  ('Texas','TX','texas','South'),                   ('Utah','UT','utah','West'),
  ('Vermont','VT','vermont','Northeast'),           ('Virginia','VA','virginia','South'),
  ('Washington','WA','washington','West'),          ('West Virginia','WV','west-virginia','South'),
  ('Wisconsin','WI','wisconsin','Midwest'),         ('Wyoming','WY','wyoming','West')
ON CONFLICT (abbreviation) DO NOTHING;

\echo ''
\echo '=== seeded states (expect 51) ==='
SELECT count(*) AS states FROM public.gw_all_state_states;

\echo ''
\echo '=== policy coverage (expect staff_write + public_read on each) ==='
SELECT tablename, count(*) AS policies
  FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'gw\_all\_state\_%'
 GROUP BY tablename ORDER BY tablename;

NOTIFY pgrst, 'reload schema';
