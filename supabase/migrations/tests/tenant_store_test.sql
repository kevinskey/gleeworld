\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  v_tenant_a uuid;
  v_tenant_b uuid;
  n int;
BEGIN
  INSERT INTO gw_tenants (id, slug, name) VALUES (gen_random_uuid(), 'ta', 'Tenant A') RETURNING id INTO v_tenant_a;
  INSERT INTO gw_tenants (id, slug, name) VALUES (gen_random_uuid(), 'tb', 'Tenant B') RETURNING id INTO v_tenant_b;

  -- Tenant A: active store add-on subscription
  INSERT INTO gw_tenant_subscriptions (tenant_id, module_id, status) VALUES (v_tenant_a, 'store', 'active');
  -- Tenant B: no store subscription row at all (add-on gate must block)

  -- Products
  INSERT INTO gw_products (tenant_id, title, name, price, is_active) VALUES (v_tenant_a, 'ProdA', 'ProdA', 10, true);
  INSERT INTO gw_products (tenant_id, title, name, price, is_active) VALUES (v_tenant_a, 'DeadA', 'DeadA', 10, false);
  INSERT INTO gw_products (tenant_id, title, name, price, is_active) VALUES (v_tenant_b, 'ProdB', 'ProdB', 10, true);

  -- Tenant A (has store add-on): sees ProdA
  SELECT count(*) INTO n FROM gw_store_list_tenant_products('ta') WHERE name = 'ProdA';
  IF n <> 1 THEN RAISE EXCEPTION 'expected ProdA visible for tenant ta, got %', n; END IF;

  -- Tenant A: never sees its own inactive product
  IF (SELECT count(*) FROM gw_store_list_tenant_products('ta') WHERE name = 'DeadA') <> 0 THEN
    RAISE EXCEPTION 'inactive product DeadA leaked for tenant ta';
  END IF;

  -- Tenant isolation: ta never sees tb's product
  IF (SELECT count(*) FROM gw_store_list_tenant_products('ta') WHERE name = 'ProdB') <> 0 THEN
    RAISE EXCEPTION 'tenant isolation violated: ta sees ProdB';
  END IF;

  -- Add-on gate: tb has NO store subscription -> zero rows even though ProdB is active
  IF (SELECT count(*) FROM gw_store_list_tenant_products('tb')) <> 0 THEN
    RAISE EXCEPTION 'add-on gate violated: tb has no store sub but RPC returned rows';
  END IF;

  RAISE NOTICE 'tenant_store_test: all assertions passed';
END $$;

ROLLBACK;
