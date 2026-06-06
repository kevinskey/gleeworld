-- HOTFIX: app INSERTs don't set tenant_id → restrictive RLS blocks them.
-- Add BEFORE INSERT trigger on every tenant-scoped table that fills tenant_id
-- from JWT claim if NULL. Also set column DEFAULT for belt-and-suspenders.

BEGIN;

-- Generic trigger function that fills tenant_id from JWT
CREATE OR REPLACE FUNCTION public.set_tenant_id_default()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE tbl text; applied int := 0;
BEGIN
  FOR tbl IN
    SELECT c.table_name FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id'
  LOOP
    -- Set DEFAULT
    BEGIN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()',
        tbl
      );
    EXCEPTION WHEN OTHERS THEN
      -- Some tables (like gw_tenants itself if it has tenant_id) might error; skip
      NULL;
    END;
    -- Add BEFORE INSERT trigger
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default()',
      tbl
    );
    applied := applied + 1;
  END LOOP;
  RAISE NOTICE 'triggers applied to % tables', applied;
END $$;

COMMIT;
