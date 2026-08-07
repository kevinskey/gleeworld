-- Read-only follow-up to audit-tenant-isolation.sql. Changes nothing.
--
-- The first audit answered "which tables lack tenant isolation" (54 of them).
-- This one answers the question that actually sets priority: "which of those
-- hold real rows today, and is there a column we could derive a tenant from?"
--
-- A table is treated as ISOLATED only if it has a RESTRICTIVE policy whose
-- predicate actually calls current_tenant_id() or anon_tenant_id(). Checking
-- merely for "has a restrictive policy" is wrong here — nearly every gw_ table
-- carries the platform-wide demo_viewer_no_modify / demo_viewer_no_delete
-- pair, which are RESTRICTIVE but do no tenant scoping whatsoever. That is
-- exactly why the ensemble tables looked covered and were not.
--
--   psql ... -f scripts/audit-tenant-isolation-exposure.sql

\set ON_ERROR_STOP on

CREATE TEMP TABLE _gap (
  tablename   text,
  gap_kind    text,     -- 'no_tenant_id' | 'no_tenant_policy'
  n_rows      bigint,
  rls_enabled boolean,
  link_cols   text,     -- candidate columns to derive a tenant from
  classify    text      -- 'global_reference' | 'service_role_only' | 'REVIEW'
) ON COMMIT PRESERVE ROWS;

DO $audit$
DECLARE
  t            record;
  v_rows       bigint;
  v_has_col    boolean;
  v_has_pol    boolean;
  v_links      text;
  v_class      text;
  -- Tables with no tenant concept by design: platform catalogs and shared
  -- reference corpora. Same shape as the All-State Layer 1 canon.
  global_ref text[] := ARRAY[
    'gw_tenants','gw_tenant_members','gw_feature_flags','gw_app_functions',
    'gw_permissions','gw_roles','gw_tax_regions','gw_webhook_events',
    'gw_bible_books','gw_bible_translations','gw_bible_verses',
    'gw_hymnals','gw_hymn_index',
    'gw_prayer_texts','gw_prayer_readings','gw_prayer_calendar_days',
    'gw_theory_levels','gw_theory_units','gw_theory_lessons','gw_theory_exercises',
    'gw_billing_plans','gw_billing_modules'
  ];
BEGIN
  FOR t IN
    SELECT c.relname AS tablename, c.relrowsecurity AS rls_on
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'gw\_%'
     ORDER BY c.relname
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name=t.tablename AND column_name='tenant_id'
    ) INTO v_has_col;

    -- Real tenant isolation, not just "some restrictive policy exists".
    SELECT EXISTS (
      SELECT 1 FROM pg_policies p
       WHERE p.schemaname='public' AND p.tablename=t.tablename
         AND p.permissive='RESTRICTIVE'
         AND (COALESCE(p.qual,'') LIKE '%current_tenant_id%'
           OR COALESCE(p.qual,'') LIKE '%anon_tenant_id%')
    ) INTO v_has_pol;

    CONTINUE WHEN v_has_col AND v_has_pol;   -- properly isolated, skip

    EXECUTE format('SELECT count(*) FROM public.%I', t.tablename) INTO v_rows;

    SELECT string_agg(column_name, ', ' ORDER BY column_name)
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name=t.tablename
       AND column_name IN ('user_id','owner_id','created_by','profile_id',
                           'student_user_id','course_id','ensemble_id',
                           'event_id','tour_id','partner_id','order_id')
      INTO v_links;

    IF t.tablename = ANY(global_ref) THEN
      v_class := 'global_reference';
    ELSIF EXISTS (
      SELECT 1 FROM pg_policies p
       WHERE p.schemaname='public' AND p.tablename=t.tablename
         AND p.roles::text ILIKE '%service_role%'
         AND NOT EXISTS (
           SELECT 1 FROM pg_policies q
            WHERE q.schemaname='public' AND q.tablename=t.tablename
              AND (q.roles::text ILIKE '%authenticated%' OR q.roles::text ILIKE '%anon%')
              AND q.permissive='PERMISSIVE')
    ) THEN
      v_class := 'service_role_only';
    ELSE
      v_class := 'REVIEW';
    END IF;

    INSERT INTO _gap VALUES (
      t.tablename,
      CASE WHEN NOT v_has_col THEN 'no_tenant_id' ELSE 'no_tenant_policy' END,
      v_rows, t.rls_on, COALESCE(v_links,'—'), v_class
    );
  END LOOP;
END
$audit$;

\echo ''
\echo '=== A. EXPOSED: real tenant data, has rows, no isolation (fix these) ==='
SELECT tablename, gap_kind, n_rows, rls_enabled, link_cols
  FROM _gap
 WHERE classify = 'REVIEW' AND n_rows > 0
 ORDER BY n_rows DESC;

\echo ''
\echo '=== B. LATENT: same defect, currently empty (fix before they fill) ==='
SELECT tablename, gap_kind, rls_enabled, link_cols
  FROM _gap
 WHERE classify = 'REVIEW' AND n_rows = 0
 ORDER BY tablename;

\echo ''
\echo '=== C. Global reference / platform catalog — expected to be tenantless ==='
SELECT tablename, n_rows, rls_enabled FROM _gap
 WHERE classify = 'global_reference' ORDER BY tablename;

\echo ''
\echo '=== D. service_role-only (not reachable by user JWTs) ==='
SELECT tablename, n_rows FROM _gap
 WHERE classify = 'service_role_only' ORDER BY tablename;

\echo ''
\echo '=== E. Any gw_ table with RLS switched OFF entirely ==='
SELECT tablename, n_rows, classify FROM _gap
 WHERE rls_enabled = false ORDER BY tablename;

\echo ''
\echo '=== F. Policies on the exposed set (what is granting access today) ==='
SELECT p.tablename, p.policyname, p.cmd, p.permissive, p.roles::text
  FROM pg_policies p
  JOIN _gap g ON g.tablename = p.tablename
 WHERE g.classify = 'REVIEW' AND g.n_rows > 0
   AND p.policyname NOT LIKE 'demo_viewer%'
 ORDER BY p.tablename, p.policyname;
