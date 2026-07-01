-- Per-tenant navigation preferences.
--
-- Each tenant super-admin can hide nav items from lower-privilege
-- users in their tenant — students, fans, graduates, members, and
-- even other tenant admins. One row per (tenant_id, role); the
-- hidden_items array lists nav-item paths ('/studio', '/dashboard/users',
-- etc.) that should NOT render in the sidebar for users of that role.
--
-- The tenant super-admin always sees every item — this table is
-- explicitly not consulted for them. Otherwise a super-admin could
-- accidentally hide the very page they need to reach their own
-- settings.

CREATE TABLE IF NOT EXISTS public.gw_tenant_nav_prefs (
  tenant_id     uuid NOT NULL DEFAULT current_tenant_id(),
  role          text NOT NULL,
  hidden_items  text[] NOT NULL DEFAULT '{}',
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid,
  PRIMARY KEY (tenant_id, role)
);

-- ── Fill tenant_id from JWT on insert ────────────────────────────────

CREATE OR REPLACE FUNCTION gw_tenant_nav_prefs_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_tenant_nav_prefs_fill_tenant_trg ON public.gw_tenant_nav_prefs;
CREATE TRIGGER gw_tenant_nav_prefs_fill_tenant_trg
  BEFORE INSERT OR UPDATE ON public.gw_tenant_nav_prefs
  FOR EACH ROW EXECUTE FUNCTION gw_tenant_nav_prefs_fill_tenant();

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE public.gw_tenant_nav_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_tenant_nav_prefs;
CREATE POLICY tenant_isolation_restrict
  ON public.gw_tenant_nav_prefs
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Every authenticated user in the tenant needs to read their own
-- role's prefs so the sidebar can filter itself.
DROP POLICY IF EXISTS nav_prefs_read ON public.gw_tenant_nav_prefs;
CREATE POLICY nav_prefs_read
  ON public.gw_tenant_nav_prefs
  FOR SELECT
  USING (true);

-- Only tenant super-admins + admins can write the prefs. Restrictive
-- tenant isolation above additionally forbids cross-tenant writes.
DROP POLICY IF EXISTS nav_prefs_admin_write ON public.gw_tenant_nav_prefs;
CREATE POLICY nav_prefs_admin_write
  ON public.gw_tenant_nav_prefs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_tenant_members tm
       WHERE tm.user_id = auth.uid()
         AND tm.tenant_id = current_tenant_id()
         AND tm.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_tenant_members tm
       WHERE tm.user_id = auth.uid()
         AND tm.tenant_id = current_tenant_id()
         AND tm.role IN ('super_admin', 'admin')
    )
  );
