-- Close the remaining tenant-isolation gaps found by
-- scripts/audit-tenant-isolation-exposure.sql (2026-08-08).
--
-- The ensemble family was fixed in 20260808100000/100100 because it was the
-- most severe. This finishes the sweep: the members store, fundraisers, merch
-- campaigns, partner orders, and the rest of the tables carrying the same
-- defect. Nearly all are EMPTY today — which is exactly why now is the moment,
-- before the store and partner portal fill them and a backfill has to guess.
--
-- SAFETY MODEL. Every table is handled by one guarded loop that refuses to
-- fence a table it could hide data from:
--   • no tenant_id and empty  → add the column, default, trigger, NOT NULL
--   • no tenant_id and NOT empty → SKIP and report. Adding a NOT NULL column
--     with a request-context default to a populated table would either fail or
--     mislabel rows, and picking the right tenant needs a human.
--   • has tenant_id, no NULLs → add restrictive policies
--   • has tenant_id with NULLs → SKIP and report. A restrictive policy makes
--     tenant_id IS NULL rows invisible to EVERY tenant, including their owner.
--
-- Restrictive policies AND with the OR-ed permissive set, so they fence every
-- existing and future permissive policy without any of them being rewritten.
-- That is what makes this safe to apply to tables whose permissive policies
-- encode real business logic (owner checks, share links, service-role access).

BEGIN;

DO $$
DECLARE
  t          text;
  v_has_col  boolean;
  v_rows     bigint;
  v_nulls    bigint;
  targets text[] := ARRAY[
    -- Empty, no tenant_id: store/fundraiser/partner tables about to be used.
    'gw_fundraiser_items', 'gw_members_store_order_lines', 'gw_partner_downloads',
    'gw_partner_order_items', 'gw_partner_orders', 'gw_partner_score_shares',
    'gw_video_shares', 'gw_user_plans',
    -- Empty, has tenant_id, no isolating policy.
    'gw_attendance_challenge_attempts', 'gw_attendance_session_secrets',
    'gw_fundraisers', 'gw_members_store_items', 'gw_members_store_orders',
    'gw_merch_campaigns', 'gw_merch_storefront_items', 'gw_tenant_entitlement',
    -- Populated, has tenant_id. These already fence correctly via PERMISSIVE
    -- policies whose predicate is (tenant_id = current_tenant_id()) — but a
    -- permissive fence can be OR-ed open by any future permissive policy
    -- added to the table. A restrictive twin makes that impossible.
    'gw_merch_products', 'gw_merch_designs', 'gw_tenant_plans',
    'gw_tenant_canvas_accounts', 'gw_fan_pages', 'gw_fan_page_blocks'
  ];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      RAISE NOTICE 'SKIP %  — table does not exist', rpad(t,34);
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name=t AND column_name='tenant_id'
    ) INTO v_has_col;

    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO v_rows;

    IF NOT v_has_col THEN
      IF v_rows > 0 THEN
        RAISE WARNING 'SKIP %  — % row(s) and no tenant_id; needs a human-chosen backfill',
          rpad(t,34), v_rows;
        CONTINUE;
      END IF;
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN tenant_id uuid REFERENCES public.gw_tenants(id)', t);
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()', t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)',
        'idx_' || t || '_tenant_id', t);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_tenant_default ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_%s_tenant_default BEFORE INSERT ON public.%I '
        'FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default()', t, t);
      -- NOT NULL only after the trigger exists, so a concurrent insert in the
      -- gap between the two statements cannot fail.
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
      RAISE NOTICE 'ADDED tenant_id to %  (was empty)', rpad(t,34);
    ELSE
      EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', t) INTO v_nulls;
      IF v_nulls > 0 THEN
        RAISE WARNING 'SKIP %  — % row(s) with NULL tenant_id; fencing would hide them',
          rpad(t,34), v_nulls;
        CONTINUE;
      END IF;
    END IF;

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

    RAISE NOTICE 'FENCED %  (% rows)', rpad(t,34), v_rows;
  END LOOP;
END $$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Verification: re-run the exposure audit's core question. Anything still
-- listed here is a deliberate skip (see the warnings above) or genuinely
-- global reference data.
-- ─────────────────────────────────────────────────────────────────────────
\echo ''
\echo '=== gw_* tables still without real tenant isolation ==='
SELECT t.tablename,
       EXISTS (SELECT 1 FROM information_schema.columns c
                WHERE c.table_schema='public' AND c.table_name=t.tablename
                  AND c.column_name='tenant_id') AS has_tenant_id
  FROM pg_tables t
 WHERE t.schemaname='public' AND t.tablename LIKE 'gw\_%'
   AND NOT EXISTS (
     SELECT 1 FROM pg_policies p
      WHERE p.schemaname='public' AND p.tablename=t.tablename
        AND p.permissive='RESTRICTIVE'
        AND (COALESCE(p.qual,'') LIKE '%current_tenant_id%'
          OR COALESCE(p.qual,'') LIKE '%anon_tenant_id%'))
 ORDER BY t.tablename;

NOTIFY pgrst, 'reload schema';
