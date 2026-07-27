-- Follow-up to 20260726120000_assistant_usage_daily.sql
--
-- The original migration shipped one RESTRICTIVE policy (tenant isolation)
-- and one PERMISSIVE policy (service_role only). Without a PERMISSIVE policy
-- for the `authenticated` role, RLS denies every INSERT/SELECT for real
-- users — a RESTRICTIVE policy can only narrow existing access, never
-- grant it. Consequence: `increment_assistant_usage()` fails from a
-- signed-in user with "new row violates row-level security policy",
-- which the `web_search` executor caught, causing the assistant to
-- report "hit today's daily search limit" on the FIRST call.
--
-- Fix: add a PERMISSIVE policy granting `authenticated` role FOR ALL,
-- matching the pattern used across the schema for tenant-scoped tables.
-- The existing RESTRICTIVE tenant_isolation policy still fires and
-- narrows access to the caller's tenant via current_tenant_id().

CREATE POLICY assistant_usage_daily_authenticated_rw
ON public.assistant_usage_daily
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
