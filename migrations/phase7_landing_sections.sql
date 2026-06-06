-- Per-tenant configurable landing-page sections.
-- One row per (tenant, section_type). Customer toggles enabled and edits
-- a free-form jsonb `config` per section.

BEGIN;

CREATE TABLE IF NOT EXISTS public.gw_landing_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.gw_tenants(id) ON DELETE CASCADE
    DEFAULT public.current_tenant_id(),
  section_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 100,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, section_type)
);
CREATE INDEX IF NOT EXISTS idx_gw_landing_sections_tenant ON public.gw_landing_sections(tenant_id);

ALTER TABLE public.gw_landing_sections ENABLE ROW LEVEL SECURITY;

-- Public landings need anon SELECT
DROP POLICY IF EXISTS landing_sections_public_read ON public.gw_landing_sections;
CREATE POLICY landing_sections_public_read ON public.gw_landing_sections
  FOR SELECT TO anon, authenticated USING (enabled);

-- Admin write — tenant-scoped, super_admin/admin only
DROP POLICY IF EXISTS landing_sections_admin_write ON public.gw_landing_sections;
CREATE POLICY landing_sections_admin_write ON public.gw_landing_sections
  FOR ALL TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.gw_tenant_members tm
      WHERE tm.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
        AND tm.tenant_id = public.current_tenant_id()
        AND tm.role IN ('super_admin','admin')
    )
  )
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Restrictive layer so cross-tenant writes are impossible
DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_landing_sections;
CREATE POLICY tenant_isolation_restrict ON public.gw_landing_sections
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Auto-fill tenant_id trigger (matches pattern used elsewhere)
DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.gw_landing_sections;
CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.gw_landing_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

COMMIT;
