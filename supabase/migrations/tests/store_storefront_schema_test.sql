\set ON_ERROR_STOP on
BEGIN;
SELECT 1/(CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='gw_store_orders' AND column_name='access_token') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN to_regclass('public.gw_store_checkout_attempts') IS NOT NULL THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN to_regprocedure('public.gw_store_list_products()') IS NOT NULL THEN 1 ELSE 0 END);
-- RPC returns only active platform-tenant products
DO $$ DECLARE n int; BEGIN
  INSERT INTO gw_products (tenant_id,name,title,price,is_active) VALUES ('bb48609d-a1ca-4905-be50-b84afdac187e','Live','Live',10,true),('bb48609d-a1ca-4905-be50-b84afdac187e','Dead','Dead',10,false);
  SELECT count(*) INTO n FROM gw_store_list_products() WHERE name='Dead';
  IF n <> 0 THEN RAISE EXCEPTION 'RPC leaked inactive product'; END IF;

  -- RPC must not leak another tenant's active products (RPC is SECURITY DEFINER, bypasses RLS)
  INSERT INTO gw_tenants(id,name,slug) VALUES ('11111111-1111-1111-1111-111111111111','Other','other') ON CONFLICT DO NOTHING;
  INSERT INTO gw_products(tenant_id,name,title,price,is_active) VALUES ('11111111-1111-1111-1111-111111111111','Foreign','Foreign',10,true);
  IF (SELECT count(*) FROM gw_store_list_products() WHERE name='Foreign') <> 0 THEN RAISE EXCEPTION 'RPC leaked another tenant''s product'; END IF;
END $$;
ROLLBACK;
