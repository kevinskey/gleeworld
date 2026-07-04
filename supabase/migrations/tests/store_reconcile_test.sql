\set ON_ERROR_STOP on
BEGIN;
SELECT 1/(CASE WHEN to_regprocedure('public.gw_store_reconcile_pending()') IS NOT NULL THEN 1 ELSE 0 END);

DO $$
DECLARE
  v_tenant UUID := 'bb48609d-a1ca-4905-be50-b84afdac187e';
  v_old_id UUID;
  v_fresh_id UUID;
  v_paid_id UUID;
  v_count INT;
BEGIN
  -- stale pending order (should be swept to 'failed')
  INSERT INTO gw_store_orders (tenant_id, store_type, buyer_email, status, created_at, updated_at)
  VALUES (v_tenant, 'gleeworld', 'stale@example.com', 'pending', now() - interval '3 hours', now() - interval '3 hours')
  RETURNING id INTO v_old_id;

  -- fresh pending order (should stay 'pending')
  INSERT INTO gw_store_orders (tenant_id, store_type, buyer_email, status, created_at, updated_at)
  VALUES (v_tenant, 'gleeworld', 'fresh@example.com', 'pending', now(), now())
  RETURNING id INTO v_fresh_id;

  -- old but already-paid order (should stay 'paid', never touched)
  INSERT INTO gw_store_orders (tenant_id, store_type, buyer_email, status, created_at, updated_at)
  VALUES (v_tenant, 'gleeworld', 'paid@example.com', 'paid', now() - interval '5 hours', now() - interval '5 hours')
  RETURNING id INTO v_paid_id;

  SELECT public.gw_store_reconcile_pending() INTO v_count;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'expected reconcile to report 1 swept order, got %', v_count;
  END IF;

  IF (SELECT status FROM gw_store_orders WHERE id = v_old_id) <> 'failed' THEN
    RAISE EXCEPTION 'stale pending order was not marked failed';
  END IF;

  IF (SELECT status FROM gw_store_orders WHERE id = v_fresh_id) <> 'pending' THEN
    RAISE EXCEPTION 'fresh pending order should remain pending';
  END IF;

  IF (SELECT status FROM gw_store_orders WHERE id = v_paid_id) <> 'paid' THEN
    RAISE EXCEPTION 'paid order should never be swept';
  END IF;
END $$;

-- privileges: SECURITY DEFINER function must not be callable by anon/authenticated
SELECT 1/(CASE WHEN NOT has_function_privilege('anon', 'public.gw_store_reconcile_pending()', 'EXECUTE') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN NOT has_function_privilege('authenticated', 'public.gw_store_reconcile_pending()', 'EXECUTE') THEN 1 ELSE 0 END);
ROLLBACK;
