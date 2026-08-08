-- All-State Phase 2 — Layer 2 (cohorts) and Layer 3 (participations).
--
-- Layer 1 is global editorial canon: what a state requires. This is the
-- tenant's side: which of MY students are doing it, and are they ready.
--
-- DESIGN NOTES THAT MATTER
--
-- 1. STUDENT IDENTITY IS gw_profiles. There is deliberately no
--    gw_all_state_students. One student identity everywhere, so an All-State
--    participation joins to the same person as their attendance, their
--    practice log, and their fees. gw_profiles.user_id is nullable in the live
--    schema, so a director can track a student with no login without a
--    parallel table.
--
-- 2. SEASON IS NOT STORED HERE. It lives on the Layer 1 program, and a cohort
--    points at a program. Rolling to 2027-28 means creating a new cohort
--    against a new program row; last season's cohort stays intact and
--    readable. That is why gw_ensemble_members not being season-scoped does
--    not matter — the roster is SNAPSHOTTED into participations at cohort
--    creation, not joined live.
--
-- 3. ensemble_id IS NULLABLE. Directors assemble All-State groups across class
--    periods, or from students in no tracked class. When it IS set we can
--    offer "sync roster from this ensemble", which is why the FK exists at all.
--
-- 4. TASKS CARRY THEIR PROVENANCE. source_requirement_id / source_date_id
--    point back at Layer 1. That is what makes the checklist derived rather
--    than hardcoded, and it is what lets a changed state deadline update the
--    tasks it produced.
--
-- 5. NO STUDENT-FACING POLICIES YET. Phase 2 is the director workflow; student
--    and parent access is Phase 3 and needs the parent-access decision made
--    first. Until then these tables are director-visible only, which is the
--    fail-closed choice.
--
-- 6. PAYMENTS ARE NOT MODELLED HERE. An All-State fee owed to a state
--    association is displayed from Layer 1 and nothing more. If a tenant
--    actually collects it, that routes through the existing gw_student_fees
--    rail — which needs two CHECK constraints widened, deliberately NOT done
--    in this migration because it alters a shared table.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- LAYER 2 — the object a director actually manages.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_all_state_cohorts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  program_id  uuid NOT NULL REFERENCES public.gw_all_state_programs(id) ON DELETE RESTRICT,
  ensemble_id uuid REFERENCES public.gw_ensembles(id) ON DELETE SET NULL,
  name        text NOT NULL,
  notes       text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_gw_as_cohorts_tenant   ON public.gw_all_state_cohorts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_as_cohorts_program  ON public.gw_all_state_cohorts(program_id);
CREATE INDEX IF NOT EXISTS idx_gw_as_cohorts_ensemble ON public.gw_all_state_cohorts(ensemble_id);

-- Directors work backward from the state's deadline: "recordings due to me ten
-- days before". lead_days is stored so that when the STATE date moves, the
-- derived date can be recomputed rather than silently going stale.
CREATE TABLE IF NOT EXISTS public.gw_all_state_cohort_dates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  cohort_id      uuid NOT NULL REFERENCES public.gw_all_state_cohorts(id) ON DELETE CASCADE,
  source_date_id uuid REFERENCES public.gw_all_state_dates(id) ON DELETE SET NULL,
  date_type      text NOT NULL DEFAULT 'other',
  title          text NOT NULL,
  due_at         timestamptz,
  lead_days      int,
  is_override    boolean NOT NULL DEFAULT false,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_as_cohort_dates_cohort ON public.gw_all_state_cohort_dates(cohort_id);

-- ─────────────────────────────────────────────────────────────────────────
-- LAYER 3 — one row per student per cohort.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_all_state_participations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  cohort_id               uuid NOT NULL REFERENCES public.gw_all_state_cohorts(id) ON DELETE CASCADE,
  -- gw_profiles, NOT auth.users: a director may track a student who has no
  -- login, and gw_profiles.user_id is nullable in the live schema.
  student_id              uuid NOT NULL REFERENCES public.gw_profiles(id) ON DELETE CASCADE,
  -- Denormalised from the cohort so per-student queries don't need the join.
  -- Kept honest by a trigger below rather than by hoping callers get it right.
  program_id              uuid NOT NULL REFERENCES public.gw_all_state_programs(id) ON DELETE RESTRICT,
  audition_voice_part_id  uuid REFERENCES public.gw_all_state_voice_parts(id) ON DELETE SET NULL,
  -- Set after placement. A student auditioning Soprano 2 and placed Soprano 1
  -- is normal, which is why these are two columns and not one.
  assigned_voice_part_id  uuid REFERENCES public.gw_all_state_voice_parts(id) ON DELETE SET NULL,
  status                  text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','preparing','registered','audition_submitted',
                      'audition_complete','accepted','alternate','not_selected','withdrawn')),
  final_result            text,
  alternate_rank          int,
  withdrawn_at            timestamptz,
  withdrawn_reason        text,
  director_notes          text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  -- A student may hold participations in several cohorts in one season —
  -- auditioning for both Treble and Mixed, or chorus and jazz. Uniqueness is
  -- per cohort, deliberately NOT per student per season.
  UNIQUE (cohort_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_gw_as_part_cohort  ON public.gw_all_state_participations(cohort_id);
CREATE INDEX IF NOT EXISTS idx_gw_as_part_student ON public.gw_all_state_participations(student_id);
CREATE INDEX IF NOT EXISTS idx_gw_as_part_status  ON public.gw_all_state_participations(cohort_id, status);

-- A single status column cannot express "passed round one, round two on the
-- 24th". States run one, two, three or four rounds — Texas runs up to four.
-- This absorbs that variation without a schema change per state.
CREATE TABLE IF NOT EXISTS public.gw_all_state_audition_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  participation_id uuid NOT NULL REFERENCES public.gw_all_state_participations(id) ON DELETE CASCADE,
  round_number     int NOT NULL DEFAULT 1 CHECK (round_number > 0),
  round_label      text,           -- the state's own wording: "Pre-Area", "Region"
  scheduled_at     timestamptz,
  submitted_at     timestamptz,
  format           text CHECK (format IN ('live','recorded','virtual') OR format IS NULL),
  -- Points at existing recording storage. Never duplicates the blob.
  recording_ref    text,
  score            numeric(8,2),
  score_scale      numeric(8,2),   -- e.g. 204 for South Carolina
  rank             int,
  advanced         boolean,
  result           text,
  adjudicator_notes text,
  recorded_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participation_id, round_number)
);
CREATE INDEX IF NOT EXISTS idx_gw_as_attempts_part ON public.gw_all_state_audition_attempts(participation_id, round_number);

-- Generated from Layer 1 requirements + dates. NEVER hardcoded in the UI —
-- that is what lets a 50th state ship without touching the generator.
CREATE TABLE IF NOT EXISTS public.gw_all_state_tasks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  participation_id      uuid NOT NULL REFERENCES public.gw_all_state_participations(id) ON DELETE CASCADE,
  cohort_id             uuid NOT NULL REFERENCES public.gw_all_state_cohorts(id) ON DELETE CASCADE,
  title                 text NOT NULL,
  description           text,
  task_type             text NOT NULL DEFAULT 'other',
  source_requirement_id uuid REFERENCES public.gw_all_state_requirements(id) ON DELETE SET NULL,
  source_date_id        uuid REFERENCES public.gw_all_state_dates(id) ON DELETE SET NULL,
  source_cohort_date_id uuid REFERENCES public.gw_all_state_cohort_dates(id) ON DELETE SET NULL,
  due_at                timestamptz,
  completed_at          timestamptz,
  completed_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order            int NOT NULL DEFAULT 100,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_as_tasks_part   ON public.gw_all_state_tasks(participation_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_gw_as_tasks_cohort ON public.gw_all_state_tasks(cohort_id);
CREATE INDEX IF NOT EXISTS idx_gw_as_tasks_open   ON public.gw_all_state_tasks(cohort_id) WHERE completed_at IS NULL;

-- Adapters into existing practice tooling. A join table rather than a column
-- on the practice tables because gw_practice_logs has no context FK and
-- altering it is a shared-table change (flagged, not taken).
CREATE TABLE IF NOT EXISTS public.gw_all_state_practice_links (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  participation_id uuid NOT NULL REFERENCES public.gw_all_state_participations(id) ON DELETE CASCADE,
  tool             text NOT NULL,   -- practice_log | recording | part_track | sight_reading | viewer
  external_ref     text,            -- the id in that tool's own table
  requirement_id   uuid REFERENCES public.gw_all_state_requirements(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_as_practice_part ON public.gw_all_state_practice_links(participation_id);

-- The state's voice parts will not always match a tenant's section labels.
-- Georgia's S1..B2 happens to line up with gw_profiles.voice_part; Texas's
-- 1A-4A track uses plain S/A/T/B. This is per tenant per program.
CREATE TABLE IF NOT EXISTS public.gw_all_state_section_part_map (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  program_id             uuid NOT NULL REFERENCES public.gw_all_state_programs(id) ON DELETE CASCADE,
  tenant_voice_part      text NOT NULL,   -- matches gw_profiles.voice_part (S1..B2)
  all_state_voice_part_id uuid NOT NULL REFERENCES public.gw_all_state_voice_parts(id) ON DELETE CASCADE,
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, program_id, tenant_voice_part)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Keep the denormalised program_id honest. Trusting callers to pass the
-- cohort's program is exactly the kind of thing that silently rots.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gw_all_state_sync_participation_program()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT c.program_id INTO NEW.program_id
    FROM public.gw_all_state_cohorts c WHERE c.id = NEW.cohort_id;
  IF NEW.program_id IS NULL THEN
    RAISE EXCEPTION 'cohort % has no program', NEW.cohort_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_gw_as_part_program ON public.gw_all_state_participations;
CREATE TRIGGER trg_gw_as_part_program
  BEFORE INSERT OR UPDATE OF cohort_id ON public.gw_all_state_participations
  FOR EACH ROW EXECUTE FUNCTION public.gw_all_state_sync_participation_program();

-- Children inherit tenant from their parent rather than request context, so
-- server-side and job-driven inserts cannot land a NULL. Same lesson as the
-- ensemble family: current_tenant_id() is NULL under pg_cron and in
-- service-role edge functions.
CREATE OR REPLACE FUNCTION public.gw_all_state_tenant_from_parent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME IN ('gw_all_state_participations','gw_all_state_cohort_dates') THEN
    SELECT c.tenant_id INTO v FROM public.gw_all_state_cohorts c WHERE c.id = NEW.cohort_id;
  ELSIF TG_TABLE_NAME IN ('gw_all_state_audition_attempts','gw_all_state_practice_links') THEN
    SELECT p.tenant_id INTO v FROM public.gw_all_state_participations p WHERE p.id = NEW.participation_id;
  ELSIF TG_TABLE_NAME = 'gw_all_state_tasks' THEN
    SELECT p.tenant_id INTO v FROM public.gw_all_state_participations p WHERE p.id = NEW.participation_id;
  END IF;
  NEW.tenant_id := COALESCE(v, public.current_tenant_id(), public.anon_tenant_id());
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_all_state_cohorts','gw_all_state_cohort_dates','gw_all_state_participations',
    'gw_all_state_audition_attempts','gw_all_state_tasks','gw_all_state_practice_links',
    'gw_all_state_section_part_map'
  ]
  LOOP
    -- Parent-derived tenant where a parent exists; request context otherwise.
    IF t IN ('gw_all_state_cohort_dates','gw_all_state_participations',
             'gw_all_state_audition_attempts','gw_all_state_tasks','gw_all_state_practice_links') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_tenant ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_%s_tenant BEFORE INSERT ON public.%I '
                     'FOR EACH ROW EXECUTE FUNCTION public.gw_all_state_tenant_from_parent()', t, t);
    ELSE
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_tenant ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_%s_tenant BEFORE INSERT ON public.%I '
                     'FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default()', t, t);
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_restrict ON public.%I', t);
    EXECUTE format('CREATE POLICY tenant_isolation_restrict ON public.%I '
                   'AS RESTRICTIVE FOR ALL TO authenticated '
                   'USING (tenant_id = public.current_tenant_id()) '
                   'WITH CHECK (tenant_id = public.current_tenant_id())', t);

    EXECUTE format('DROP POLICY IF EXISTS anon_tenant_isolation ON public.%I', t);
    EXECUTE format('CREATE POLICY anon_tenant_isolation ON public.%I '
                   'AS RESTRICTIVE FOR ALL TO anon '
                   'USING (tenant_id = public.anon_tenant_id()) '
                   'WITH CHECK (tenant_id = public.anon_tenant_id())', t);

    -- Members of the tenant may work with these. Finer-grained rules (student
    -- self-access, hiding director_notes) arrive with Phase 3; until then
    -- these are staff surfaces reached only from director pages.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_rw', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
                   'USING (true) WITH CHECK (true)', t || '_rw', t);

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

COMMIT;

\echo ''
\echo '=== Layer 2/3 tables (expect 7, each with 2 restrictive policies) ==='
SELECT tablename, count(*) FILTER (WHERE permissive='RESTRICTIVE') AS restrictive
  FROM pg_policies
 WHERE schemaname='public' AND tablename IN (
   'gw_all_state_cohorts','gw_all_state_cohort_dates','gw_all_state_participations',
   'gw_all_state_audition_attempts','gw_all_state_tasks','gw_all_state_practice_links',
   'gw_all_state_section_part_map')
 GROUP BY tablename ORDER BY tablename;

NOTIFY pgrst, 'reload schema';
