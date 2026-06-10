-- Tenant isolation for anonymous requests.
--
-- tenant_isolation_restrict only binds TO authenticated, so anon API reads
-- (public calendar, landing pages, public forms) saw every tenant's rows.
-- Anon JWTs carry no tenant claim, so the frontend identifies its tenant via
-- an x-tenant-slug header (set globally in client.ts from __TENANT_CONFIG__),
-- which PostgREST exposes through request.headers.
--
-- The header is client-controlled, so this scopes anon traffic per tenant
-- site rather than providing hard security — acceptable because anon can
-- only ever reach rows that permissive anon/public policies already allow
-- (public events, public content, anonymous form inserts).

CREATE OR REPLACE FUNCTION public.anon_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.gw_tenants
  WHERE slug = current_setting('request.headers', true)::json->>'x-tenant-slug'
$$;

GRANT EXECUTE ON FUNCTION public.anon_tenant_id() TO anon, authenticated;

-- Anonymous inserts (booking requests, signups) have no JWT tenant claim, so
-- the BEFORE INSERT default trigger must fall back to the header tenant or
-- the new anon restrictive WITH CHECK would reject every anon write.
CREATE OR REPLACE FUNCTION public.set_tenant_id_default()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := COALESCE(public.current_tenant_id(), public.anon_tenant_id());
  END IF;
  RETURN NEW;
END;
$$;

-- Mirror the authenticated restrictive policy for anon on every
-- tenant-scoped table. Tables anon has no grants/policies on are unaffected.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY anon_tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL TO anon
         USING (tenant_id = public.anon_tenant_id())
         WITH CHECK (tenant_id = public.anon_tenant_id())',
      t
    );
  END LOOP;
END;
$$;
