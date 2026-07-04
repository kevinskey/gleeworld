\set ON_ERROR_STOP on
-- Wrapped in a transaction that rolls back at the end so this file is safely
-- rerunnable against the same scratch DB without unique-constraint collisions
-- (e.g. provider_session_id) from a prior run's seed data.
BEGIN;
-- Seed a tenant + a stocked physical product + a digital product + a pending order.
-- (Uses a fixed tenant id present in scratch; adjust seed as needed.)
DO $$
DECLARE v_tenant UUID; v_phys UUID; v_dig UUID; v_order UUID; r1 JSONB; r2 JSONB;
BEGIN
  SELECT id INTO v_tenant FROM gw_tenants LIMIT 1;
  INSERT INTO gw_products (tenant_id, name, title, price, manage_stock, stock_quantity, requires_shipping)
    VALUES (v_tenant,'Tee','Tee',20,true,1,true) RETURNING id INTO v_phys;
  INSERT INTO gw_products (tenant_id, name, title, price, manage_stock, stock_quantity, requires_shipping)
    VALUES (v_tenant,'Album','Album',10,false,0,false) RETURNING id INTO v_dig;
  INSERT INTO gw_store_orders (tenant_id, store_type, buyer_email, amount_cents, status)
    VALUES (v_tenant,'tenant','b@x.com',3000,'pending') RETURNING id INTO v_order;
  INSERT INTO gw_store_order_items (tenant_id, order_id, product_id, unit_price_cents, quantity, is_digital)
    VALUES (v_tenant,v_order,v_phys,2000,1,false),(v_tenant,v_order,v_dig,1000,1,true);

  r1 := public.gw_store_fulfill_order(v_order,'sess_1','pi_1');
  IF (r1->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'first fulfill not ok: %', r1; END IF;
  IF (SELECT status FROM gw_store_orders WHERE id=v_order) <> 'paid' THEN RAISE EXCEPTION 'order not paid'; END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_phys) <> 0 THEN RAISE EXCEPTION 'stock not decremented'; END IF;
  IF (SELECT count(*) FROM gw_store_entitlements WHERE order_id=v_order) <> 1 THEN RAISE EXCEPTION 'entitlement not minted'; END IF;

  r2 := public.gw_store_fulfill_order(v_order,'sess_1','pi_1');  -- retry
  IF (r2->>'already_paid') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'retry not idempotent: %', r2; END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_phys) <> 0 THEN RAISE EXCEPTION 'retry double-decremented'; END IF;
  RAISE NOTICE 'fulfill test passed';
END $$;

-- Oversell block: 1-stock product, two pending orders each qty 1.
-- Fulfilling both should block the second under the FOR UPDATE lock.
DO $$
DECLARE v_tenant UUID; v_prod UUID; v_order_a UUID; v_order_b UUID; ra JSONB; rb JSONB;
BEGIN
  SELECT id INTO v_tenant FROM gw_tenants LIMIT 1;
  INSERT INTO gw_products (tenant_id, name, title, price, manage_stock, stock_quantity, requires_shipping)
    VALUES (v_tenant,'Limited Tee','Limited Tee',25,true,1,true) RETURNING id INTO v_prod;

  INSERT INTO gw_store_orders (tenant_id, store_type, buyer_email, amount_cents, status)
    VALUES (v_tenant,'tenant','a@x.com',2500,'pending') RETURNING id INTO v_order_a;
  INSERT INTO gw_store_order_items (tenant_id, order_id, product_id, unit_price_cents, quantity, is_digital)
    VALUES (v_tenant,v_order_a,v_prod,2500,1,false);

  INSERT INTO gw_store_orders (tenant_id, store_type, buyer_email, amount_cents, status)
    VALUES (v_tenant,'tenant','b2@x.com',2500,'pending') RETURNING id INTO v_order_b;
  INSERT INTO gw_store_order_items (tenant_id, order_id, product_id, unit_price_cents, quantity, is_digital)
    VALUES (v_tenant,v_order_b,v_prod,2500,1,false);

  ra := public.gw_store_fulfill_order(v_order_a,'sess_a','pi_a');
  IF (ra->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'order A should have fulfilled: %', ra; END IF;

  rb := public.gw_store_fulfill_order(v_order_b,'sess_b','pi_b');
  IF (rb->>'error') IS DISTINCT FROM 'over_capacity' THEN RAISE EXCEPTION 'order B should have been blocked by oversell: %', rb; END IF;
  IF (SELECT status FROM gw_store_orders WHERE id=v_order_b) <> 'pending' THEN RAISE EXCEPTION 'blocked order B should remain pending'; END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_prod) <> 0 THEN RAISE EXCEPTION 'stock should be 0 after single fulfillment'; END IF;
  RAISE NOTICE 'oversell test passed';
END $$;

-- Refund block: fulfill an order, then refund it; assert status + stock restored.
DO $$
DECLARE v_tenant UUID; v_prod UUID; v_order UUID; rf JSONB; rr JSONB;
BEGIN
  SELECT id INTO v_tenant FROM gw_tenants LIMIT 1;
  INSERT INTO gw_products (tenant_id, name, title, price, manage_stock, stock_quantity, requires_shipping)
    VALUES (v_tenant,'Refundable Mug','Refundable Mug',15,true,5,true) RETURNING id INTO v_prod;

  INSERT INTO gw_store_orders (tenant_id, store_type, buyer_email, amount_cents, status)
    VALUES (v_tenant,'tenant','c@x.com',1500,'pending') RETURNING id INTO v_order;
  INSERT INTO gw_store_order_items (tenant_id, order_id, product_id, unit_price_cents, quantity, is_digital)
    VALUES (v_tenant,v_order,v_prod,1500,2,false);

  rf := public.gw_store_fulfill_order(v_order,'sess_c','pi_c');
  IF (rf->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'refund-setup fulfill not ok: %', rf; END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_prod) <> 3 THEN RAISE EXCEPTION 'stock not decremented before refund'; END IF;

  rr := public.gw_store_refund_order(v_order);
  IF (rr->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'refund not ok: %', rr; END IF;
  IF (SELECT status FROM gw_store_orders WHERE id=v_order) <> 'refunded' THEN RAISE EXCEPTION 'order not marked refunded'; END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_prod) <> 5 THEN RAISE EXCEPTION 'stock not restored after refund'; END IF;

  -- Idempotent refund retry.
  rr := public.gw_store_refund_order(v_order);
  IF (rr->>'already_refunded') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'refund retry not idempotent: %', rr; END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_prod) <> 5 THEN RAISE EXCEPTION 'refund retry double-restored stock'; END IF;
  RAISE NOTICE 'refund test passed';
END $$;

-- Partial-decrement regression: multi-item order where item A has stock and
-- item B oversells. Must be all-or-nothing: item A's stock must NOT move,
-- and a retry after the block must still leave item A untouched (no
-- unbounded re-decrement of already-validated items on each webhook retry).
DO $$
DECLARE v_tenant UUID; v_prod_a UUID; v_prod_b UUID; v_order UUID; r1 JSONB; r2 JSONB;
BEGIN
  SELECT id INTO v_tenant FROM gw_tenants LIMIT 1;
  INSERT INTO gw_products (tenant_id, name, title, price, manage_stock, stock_quantity, requires_shipping)
    VALUES (v_tenant,'Item A','Item A',10,true,5,true) RETURNING id INTO v_prod_a;
  INSERT INTO gw_products (tenant_id, name, title, price, manage_stock, stock_quantity, requires_shipping)
    VALUES (v_tenant,'Item B','Item B',10,true,0,true) RETURNING id INTO v_prod_b;

  INSERT INTO gw_store_orders (tenant_id, store_type, buyer_email, amount_cents, status)
    VALUES (v_tenant,'tenant','partial@x.com',2000,'pending') RETURNING id INTO v_order;
  INSERT INTO gw_store_order_items (tenant_id, order_id, product_id, unit_price_cents, quantity, is_digital)
    VALUES (v_tenant,v_order,v_prod_a,1000,1,false),(v_tenant,v_order,v_prod_b,1000,1,false);

  r1 := public.gw_store_fulfill_order(v_order,'sess_partial','pi_partial');
  IF (r1->>'error') IS DISTINCT FROM 'over_capacity' THEN RAISE EXCEPTION 'expected over_capacity on multi-item oversell: %', r1; END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_prod_a) <> 5 THEN RAISE EXCEPTION 'item A stock must be unchanged after blocked multi-item fulfill, got %', (SELECT stock_quantity FROM gw_products WHERE id=v_prod_a); END IF;
  IF (SELECT status FROM gw_store_orders WHERE id=v_order) <> 'pending' THEN RAISE EXCEPTION 'order should remain pending after oversell block'; END IF;

  -- Retry (as a webhook redelivery would do): must not re-decrement item A.
  r2 := public.gw_store_fulfill_order(v_order,'sess_partial','pi_partial');
  IF (r2->>'error') IS DISTINCT FROM 'over_capacity' THEN RAISE EXCEPTION 'expected over_capacity on retry: %', r2; END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_prod_a) <> 5 THEN RAISE EXCEPTION 'retry must not re-decrement item A stock, got %', (SELECT stock_quantity FROM gw_products WHERE id=v_prod_a); END IF;
  RAISE NOTICE 'partial-decrement regression test passed';
END $$;

-- Same-product oversell regression: ONE order with TWO line items for the
-- SAME product_id (e.g. Small + Large of one shirt), each qty 1, but the
-- product only has 1 unit of stock. Per-line-item validation would check
-- each line against the un-decremented stock_quantity=1 and let both pass,
-- then decrement twice (1 -> 0 -> -1), a real oversell. Aggregated
-- per-product validation must catch this and block the whole order.
DO $$
DECLARE v_tenant UUID; v_prod UUID; v_order UUID; r1 JSONB;
BEGIN
  SELECT id INTO v_tenant FROM gw_tenants LIMIT 1;
  INSERT INTO gw_products (tenant_id, name, title, price, manage_stock, stock_quantity, requires_shipping)
    VALUES (v_tenant,'Same-Product Tee','Same-Product Tee',20,true,1,true) RETURNING id INTO v_prod;

  INSERT INTO gw_store_orders (tenant_id, store_type, buyer_email, amount_cents, status)
    VALUES (v_tenant,'tenant','same-prod@x.com',4000,'pending') RETURNING id INTO v_order;
  -- Two line items, same product_id, distinct (NULL) variant_id, qty 1 each.
  INSERT INTO gw_store_order_items (tenant_id, order_id, product_id, variant_id, unit_price_cents, quantity, is_digital)
    VALUES (v_tenant,v_order,v_prod,NULL,2000,1,false),(v_tenant,v_order,v_prod,NULL,2000,1,false);

  r1 := public.gw_store_fulfill_order(v_order,'sess_same_prod','pi_same_prod');
  IF (r1->>'error') IS DISTINCT FROM 'over_capacity' THEN
    RAISE EXCEPTION 'expected over_capacity for same-product multi-line oversell, got: %', r1;
  END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_prod) <> 1 THEN
    RAISE EXCEPTION 'same-product oversell must NOT decrement stock, got %', (SELECT stock_quantity FROM gw_products WHERE id=v_prod);
  END IF;
  IF (SELECT status FROM gw_store_orders WHERE id=v_order) <> 'pending' THEN
    RAISE EXCEPTION 'order should remain pending after same-product oversell block';
  END IF;
  RAISE NOTICE 'same-product oversell regression test passed';
END $$;

-- Same-product happy path: ONE order with TWO line items for the SAME
-- product_id, each qty 1, and stock_quantity=2 (exactly enough in
-- aggregate). Must succeed and decrement stock ONCE by the aggregated
-- total (2), landing at 0 -- not double-decremented per line item to -0
-- some other wrong value, and not blocked despite each individual line
-- looking fine on its own.
DO $$
DECLARE v_tenant UUID; v_prod UUID; v_order UUID; r1 JSONB;
BEGIN
  SELECT id INTO v_tenant FROM gw_tenants LIMIT 1;
  INSERT INTO gw_products (tenant_id, name, title, price, manage_stock, stock_quantity, requires_shipping)
    VALUES (v_tenant,'Same-Product Tee 2','Same-Product Tee 2',20,true,2,true) RETURNING id INTO v_prod;

  INSERT INTO gw_store_orders (tenant_id, store_type, buyer_email, amount_cents, status)
    VALUES (v_tenant,'tenant','same-prod-ok@x.com',4000,'pending') RETURNING id INTO v_order;
  INSERT INTO gw_store_order_items (tenant_id, order_id, product_id, variant_id, unit_price_cents, quantity, is_digital)
    VALUES (v_tenant,v_order,v_prod,NULL,2000,1,false),(v_tenant,v_order,v_prod,NULL,2000,1,false);

  r1 := public.gw_store_fulfill_order(v_order,'sess_same_prod_ok','pi_same_prod_ok');
  IF (r1->>'ok') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'expected ok=true for same-product multi-line within capacity, got: %', r1;
  END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_prod) <> 0 THEN
    RAISE EXCEPTION 'same-product aggregated decrement should leave stock at 0, got %', (SELECT stock_quantity FROM gw_products WHERE id=v_prod);
  END IF;
  IF (SELECT status FROM gw_store_orders WHERE id=v_order) <> 'paid' THEN
    RAISE EXCEPTION 'order should be paid after successful same-product fulfill';
  END IF;
  RAISE NOTICE 'same-product happy-path aggregation test passed';
END $$;

ROLLBACK;
