-- Ensemble family + student profiles: tenant isolation, PART 1 of 2 (backfill).
--
-- WHY THIS IS NEEDED
-- gw_ensembles and its children were created 2026-06-08 (program_health_phase0),
-- AFTER migrations/phase1_tenants.sql and phase2_rls_rollout.sql had already run.
-- Those two scripts enumerate `pg_tables` at run time, so they only ever touched
-- the tables that existed on the day they ran. Nothing has added tenant_id to
-- these tables since — verified: zero migrations ALTER them and mention tenant_id.
--
-- The result, live today:
--   gw_ensembles          SELECT USING (is_active = true)      -- every tenant, incl. anon
--   gw_ensemble_directors SELECT USING (auth.role() = 'authenticated')
--   gw_section_targets    SELECT USING (auth.role() = 'authenticated')
--   ...and on all of them: FOR ALL USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
--
-- is_admin(_user_id) is defined (20250804122611) as a bare EXISTS on gw_profiles
-- with NO tenant predicate. On a table with no tenant_id and no RESTRICTIVE
-- policy, that grants every tenant admin full read AND WRITE over every other
-- tenant's ensembles, directors, rosters, section targets, health snapshots,
-- action plans, and contact log. gw_student_profiles is worse still: its
-- policies are literally USING (true) for SELECT/INSERT/UPDATE.
--
-- WHAT THIS MIGRATION DOES
-- Additive only. Adds a NULLABLE tenant_id, derives it, indexes it, and reports.
-- It changes NO policy and enforces NOTHING, so it cannot lock anyone out.
-- Enforcement is the separate part-2 migration, which refuses to run while any
-- row is still unresolved.
--
-- RUN PART 1, READ THE NOTICES, THEN RUN PART 2.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Add nullable tenant_id to each affected table.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.gw_ensembles          ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);
ALTER TABLE public.gw_ensemble_directors ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);
ALTER TABLE public.gw_ensemble_members   ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);
ALTER TABLE public.gw_section_targets    ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);
ALTER TABLE public.gw_health_snapshots   ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);
ALTER TABLE public.gw_action_plans       ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);
ALTER TABLE public.gw_contact_log        ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);
ALTER TABLE public.gw_student_profiles   ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Derive gw_ensembles.tenant_id.
--
-- Ensembles carry no tenant link of any kind, so tenancy has to be inferred.
-- Sources in descending order of trust:
--   (a) course_id  → gw_courses.tenant_id     — an explicit, already-tenanted FK
--   (b) primary director → gw_profiles.tenant_id
--   (c) any director     → gw_profiles.tenant_id
--   (d) modal tenant of the member roster
-- Each step only fills rows still NULL, so (a) always wins over (b), etc.
-- Deliberately NO blanket fallback to 'spelman': silently mislabelling an
-- ensemble is worse than leaving it NULL for a human to resolve, and part 2
-- will refuse to proceed while any NULL remains.
-- ─────────────────────────────────────────────────────────────────────────

-- (a) via the academic course
UPDATE public.gw_ensembles e
   SET tenant_id = c.tenant_id
  FROM public.gw_courses c
 WHERE e.tenant_id IS NULL
   AND e.course_id = c.id
   AND c.tenant_id IS NOT NULL;

-- (b) via the primary director's profile
UPDATE public.gw_ensembles e
   SET tenant_id = p.tenant_id
  FROM public.gw_ensemble_directors d
  JOIN public.gw_profiles p ON p.id = d.profile_id
 WHERE e.tenant_id IS NULL
   AND d.ensemble_id = e.id
   AND d.is_primary = true
   AND p.tenant_id IS NOT NULL;

-- (c) via any director
UPDATE public.gw_ensembles e
   SET tenant_id = sub.tenant_id
  FROM (
    SELECT DISTINCT ON (d.ensemble_id) d.ensemble_id, p.tenant_id
      FROM public.gw_ensemble_directors d
      JOIN public.gw_profiles p ON p.id = d.profile_id
     WHERE p.tenant_id IS NOT NULL
     ORDER BY d.ensemble_id, d.created_at
  ) sub
 WHERE e.tenant_id IS NULL
   AND sub.ensemble_id = e.id;

-- (d) via the most common tenant among members
UPDATE public.gw_ensembles e
   SET tenant_id = sub.tenant_id
  FROM (
    SELECT m.ensemble_id, p.tenant_id, COUNT(*) AS n,
           ROW_NUMBER() OVER (PARTITION BY m.ensemble_id ORDER BY COUNT(*) DESC, p.tenant_id) AS rn
      FROM public.gw_ensemble_members m
      JOIN public.gw_profiles p ON p.id = m.profile_id
     WHERE p.tenant_id IS NOT NULL
     GROUP BY m.ensemble_id, p.tenant_id
  ) sub
 WHERE e.tenant_id IS NULL
   AND sub.ensemble_id = e.id
   AND sub.rn = 1;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Children inherit from their ensemble. Unambiguous — every one of these
--    tables has a NOT NULL ensemble_id FK.
-- ─────────────────────────────────────────────────────────────────────────
UPDATE public.gw_ensemble_directors c SET tenant_id = e.tenant_id
  FROM public.gw_ensembles e WHERE c.ensemble_id = e.id AND c.tenant_id IS NULL AND e.tenant_id IS NOT NULL;

UPDATE public.gw_ensemble_members c SET tenant_id = e.tenant_id
  FROM public.gw_ensembles e WHERE c.ensemble_id = e.id AND c.tenant_id IS NULL AND e.tenant_id IS NOT NULL;

UPDATE public.gw_section_targets c SET tenant_id = e.tenant_id
  FROM public.gw_ensembles e WHERE c.ensemble_id = e.id AND c.tenant_id IS NULL AND e.tenant_id IS NOT NULL;

UPDATE public.gw_health_snapshots c SET tenant_id = e.tenant_id
  FROM public.gw_ensembles e WHERE c.ensemble_id = e.id AND c.tenant_id IS NULL AND e.tenant_id IS NOT NULL;

UPDATE public.gw_action_plans c SET tenant_id = e.tenant_id
  FROM public.gw_ensembles e WHERE c.ensemble_id = e.id AND c.tenant_id IS NULL AND e.tenant_id IS NOT NULL;

-- gw_contact_log is keyed by profile, not ensemble (program_health_phase5).
UPDATE public.gw_contact_log c SET tenant_id = p.tenant_id
  FROM public.gw_profiles p
 WHERE c.tenant_id IS NULL AND p.tenant_id IS NOT NULL
   AND p.id = c.profile_id;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. gw_student_profiles — the CSV-import / no-login roster rows.
--    Their only tenant signal is the course they were enrolled into.
-- ─────────────────────────────────────────────────────────────────────────
UPDATE public.gw_student_profiles s
   SET tenant_id = sub.tenant_id
  FROM (
    SELECT DISTINCT ON (en.student_profile_id) en.student_profile_id, co.tenant_id
      FROM public.gw_course_enrollments en
      JOIN public.gw_courses co ON co.id = en.course_id
     WHERE en.student_profile_id IS NOT NULL
       AND co.tenant_id IS NOT NULL
     ORDER BY en.student_profile_id, en.enrolled_at
  ) sub
 WHERE s.tenant_id IS NULL
   AND sub.student_profile_id = s.id;

-- A claimed student profile can also resolve through its linked account.
UPDATE public.gw_student_profiles s
   SET tenant_id = p.tenant_id
  FROM public.gw_profiles p
 WHERE s.tenant_id IS NULL
   AND s.user_id IS NOT NULL
   AND p.user_id = s.user_id
   AND p.tenant_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Indexes (RLS predicates hit tenant_id on every single row read).
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gw_ensembles_tenant_id          ON public.gw_ensembles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_ensemble_directors_tenant_id ON public.gw_ensemble_directors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_ensemble_members_tenant_id   ON public.gw_ensemble_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_section_targets_tenant_id    ON public.gw_section_targets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_health_snapshots_tenant_id   ON public.gw_health_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_action_plans_tenant_id       ON public.gw_action_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_contact_log_tenant_id        ON public.gw_contact_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_student_profiles_tenant_id   ON public.gw_student_profiles(tenant_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Report. Anything non-zero here must be resolved by hand before part 2.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE r record; total int := 0;
BEGIN
  FOR r IN
    SELECT 'gw_ensembles' AS t, COUNT(*) AS n FROM public.gw_ensembles          WHERE tenant_id IS NULL
    UNION ALL SELECT 'gw_ensemble_directors', COUNT(*) FROM public.gw_ensemble_directors WHERE tenant_id IS NULL
    UNION ALL SELECT 'gw_ensemble_members',   COUNT(*) FROM public.gw_ensemble_members   WHERE tenant_id IS NULL
    UNION ALL SELECT 'gw_section_targets',    COUNT(*) FROM public.gw_section_targets    WHERE tenant_id IS NULL
    UNION ALL SELECT 'gw_health_snapshots',   COUNT(*) FROM public.gw_health_snapshots   WHERE tenant_id IS NULL
    UNION ALL SELECT 'gw_action_plans',       COUNT(*) FROM public.gw_action_plans       WHERE tenant_id IS NULL
    UNION ALL SELECT 'gw_contact_log',        COUNT(*) FROM public.gw_contact_log        WHERE tenant_id IS NULL
    UNION ALL SELECT 'gw_student_profiles',   COUNT(*) FROM public.gw_student_profiles   WHERE tenant_id IS NULL
  LOOP
    RAISE NOTICE 'unresolved tenant_id: %  =  %', rpad(r.t, 24), r.n;
    total := total + r.n;
  END LOOP;
  RAISE NOTICE '---';
  IF total = 0 THEN
    RAISE NOTICE 'All rows resolved. Safe to run part 2 (enforce).';
  ELSE
    RAISE WARNING '% rows unresolved. Fix them by hand, THEN run part 2.', total;
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
