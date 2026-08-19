-- Ensemble family + student profiles: tenant isolation, PART 2 of 2 (enforce).
--
-- Run ONLY after part 1 reports zero unresolved rows. This migration aborts
-- if any tenant_id is still NULL — enforcing isolation while rows are
-- unlabelled would hide those rows from every tenant, including their owner.
--
-- APPROACH: add the isolation the rest of the codebase already uses, and
-- leave the existing permissive policies alone. That is deliberate, and it is
-- the pattern phase2_rls_rollout.sql documents:
--
--   "Pre-existing permissive policies (role/admin checks) remain in effect;
--    restrictive policy ANDs on top to enforce tenant isolation."
--
-- So `USING (is_active = true)` and `USING (is_admin(auth.uid()))` can stay
-- exactly as written. Once a RESTRICTIVE tenant policy exists on the table,
-- Postgres ANDs it with every permissive policy, and a foreign-tenant admin
-- is filtered out before their admin check is ever reached. Rewriting those
-- permissive policies would be a larger, riskier diff for no added safety.
--
-- The one thing that does NOT come free: phase2's restrictive policy is
-- `TO authenticated` only, while several of these permissive policies have no
-- TO clause and therefore apply to anon as well. Each table below gets BOTH
-- the authenticated and the anon restrictive twin, per the pattern in
-- 20260610150000_anon_tenant_isolation.sql.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Refuse to enforce over unlabelled data.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE total int;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM public.gw_ensembles          WHERE tenant_id IS NULL)
  + (SELECT COUNT(*) FROM public.gw_ensemble_directors WHERE tenant_id IS NULL)
  + (SELECT COUNT(*) FROM public.gw_ensemble_members   WHERE tenant_id IS NULL)
  + (SELECT COUNT(*) FROM public.gw_section_targets    WHERE tenant_id IS NULL)
  + (SELECT COUNT(*) FROM public.gw_health_snapshots   WHERE tenant_id IS NULL)
  + (SELECT COUNT(*) FROM public.gw_action_plans       WHERE tenant_id IS NULL)
  + (SELECT COUNT(*) FROM public.gw_contact_log        WHERE tenant_id IS NULL)
  INTO total;

  IF total > 0 THEN
    RAISE EXCEPTION
      'Refusing to enforce: % row(s) still have a NULL tenant_id. Run part 1, resolve them, then retry.', total;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Default tenant_id for new rows.
--
-- The house trigger set_tenant_id_default() (20260610150000) falls back to
-- current_tenant_id() then anon_tenant_id() — both of which read the request
-- context. That is right for rows a user creates, and WRONG for the child
-- tables, because recompute_all_health_snapshots() runs under pg_cron
-- ('recompute-health-nightly', 20260608190409) where there is no request and
-- both helpers return NULL. compute_health_snapshot() does not name
-- tenant_id in its INSERT, so the generic trigger would leave it NULL and the
-- NOT NULL constraint below would break the nightly job outright.
--
-- So the child tables derive tenant from their parent instead. That is
-- correct by construction, independent of who is calling, and it means the
-- existing compute/insert functions need no edit.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.gw_set_tenant_from_ensemble()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.ensemble_id IS NOT NULL THEN
    SELECT e.tenant_id INTO NEW.tenant_id
      FROM public.gw_ensembles e WHERE e.id = NEW.ensemble_id;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := COALESCE(public.current_tenant_id(), public.anon_tenant_id());
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.gw_set_tenant_from_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.profile_id IS NOT NULL THEN
    SELECT p.tenant_id INTO NEW.tenant_id
      FROM public.gw_profiles p WHERE p.id = NEW.profile_id;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := COALESCE(public.current_tenant_id(), public.anon_tenant_id());
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text; fn text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_ensembles','gw_ensemble_directors','gw_ensemble_members',
    'gw_section_targets','gw_health_snapshots','gw_action_plans',
    'gw_contact_log'
  ]
  LOOP
    fn := CASE
            WHEN t IN ('gw_ensemble_directors','gw_ensemble_members',
                       'gw_section_targets','gw_health_snapshots','gw_action_plans')
              THEN 'gw_set_tenant_from_ensemble'
            WHEN t = 'gw_contact_log' THEN 'gw_set_tenant_from_profile'
            ELSE 'set_tenant_id_default'
          END;

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_tenant_default ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_tenant_default BEFORE INSERT ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.%I()', t, t, fn);

    -- NOT NULL last: the trigger must be in place first, or a concurrent
    -- insert between the two statements would fail.
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. RESTRICTIVE isolation, both roles, on every table.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_ensembles','gw_ensemble_directors','gw_ensemble_members',
    'gw_section_targets','gw_health_snapshots','gw_action_plans',
    'gw_contact_log'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_restrict ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_restrict ON public.%I '
      'AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (tenant_id = public.current_tenant_id()) '
      'WITH CHECK (tenant_id = public.current_tenant_id())', t);

    EXECUTE format('DROP POLICY IF EXISTS anon_tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY anon_tenant_isolation ON public.%I '
      'AS RESTRICTIVE FOR ALL TO anon '
      'USING (tenant_id = public.anon_tenant_id()) '
      'WITH CHECK (tenant_id = public.anon_tenant_id())', t);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. gw_student_profiles is DELIBERATELY NOT ENFORCED HERE.
--
-- NOTE (verified against the live DB 2026-08-08): the CROSS-tenant half of
-- this is already closed out-of-band. gw_student_profiles has a tenant_id
-- column and a tenant_isolation_restrict policy on the live database, even
-- though no migration in this repo added either — more schema drift, like
-- gw_tenants and gw_courses. Do not trust the migration history here.
--
-- What remains open is the WITHIN-tenant half: the policies that despite
-- being named "Admins can insert / update student profiles" are literally
-- USING (true) / WITH CHECK (true) with no admin predicate at all
-- (20260108015619), so any authenticated user in the tenant can rewrite any
-- student record, including a student editing their classmates.
--
-- That still cannot be closed by a migration alone. Its rows are created by two
-- edge functions — upload-classlist-csv and fetch-students-from-gleeworld —
-- which build a SERVICE-ROLE client and insert with no tenant context of any
-- kind: no x-tenant-slug forwarding, no tenant argument, no tenant_id in the
-- insert payload. Under a restrictive tenant policy those imports would
-- either violate NOT NULL or write rows that are invisible to every tenant
-- including the one that imported them. Enforcing here would trade a
-- confidentiality bug for an availability bug on a live feature.
--
-- Part 1 already added and backfilled the column, which is safe and changes
-- nothing. Sequencing for the rest, as a separate reviewed change:
--   1. patch both edge functions to resolve a tenant and pass tenant_id
--   2. re-run the part-1 backfill to catch rows written in between
--   3. apply NOT NULL + the restrictive twins + replace the USING (true)
--      policies with admin-or-self write
-- ─────────────────────────────────────────────────────────────────────────

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Verification — every table should report BOTH restrictive policies.
-- ─────────────────────────────────────────────────────────────────────────
\echo ''
-- Expect 4 per table, not 2: these tables already carry the platform-wide
-- demo_viewer_no_modify / demo_viewer_no_delete pair (also RESTRICTIVE,
-- role public), and this migration adds tenant_isolation_restrict +
-- anon_tenant_isolation on top. Confirmed 4/4 on all seven, 2026-08-08.
\echo '=== restrictive policy coverage (expect 4 per table) ==='
SELECT tablename, COUNT(*) AS restrictive_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'RESTRICTIVE'
  AND tablename IN ('gw_ensembles','gw_ensemble_directors','gw_ensemble_members',
                    'gw_section_targets','gw_health_snapshots','gw_action_plans',
                    'gw_contact_log')
GROUP BY tablename
ORDER BY tablename;

NOTIFY pgrst, 'reload schema';
