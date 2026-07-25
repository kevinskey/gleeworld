-- gw_profiles: let a user always see + modify their own row, regardless
-- of which tenant subdomain they're currently on.
--
-- The RESTRICTIVE policy tenant_isolation_restrict on gw_profiles has
-- qual `tenant_id = current_tenant_id()`. Multi-tenant users (a super-
-- admin with memberships in main + kevin, for example) have their
-- profile row stored under ONE tenant (main), so when they visit
-- kevin.gleeworld.org — where current_tenant_id() resolves to kevin —
-- the restrict policy hides their own profile from SELECT AND blocks
-- any INSERT/UPDATE targeting it (RLS applies to the payload's
-- tenant_id column too). Symptoms in prod: repeated 403 Forbidden
-- POSTs to /rest/v1/gw_profiles on every page load, no user avatar /
-- display name in the shell.
--
-- Fix: replace the qual with a disjunction — the row is accessible
-- when either the tenant matches OR the row is the caller's own.
-- Owner access is scoped strictly by auth.uid(), so this doesn't
-- cross-leak profiles between users; it only lets you see YOUR own
-- row from any subdomain your session lands on.
--
-- Applied only to gw_profiles — other tables' tenant_isolation
-- policies stay untouched.

ALTER POLICY tenant_isolation_restrict
  ON public.gw_profiles
  USING (tenant_id = current_tenant_id() OR user_id = auth.uid())
  WITH CHECK (tenant_id = current_tenant_id() OR user_id = auth.uid());
