-- Studio FX presets (Phase 3). A preset is a saved FX chain (array of FxNode
-- {id,type,enabled,params}) a user can apply to any track. Tenant-scoped +
-- owner-owned, following the platform RLS convention: a RESTRICTIVE tenant
-- isolation policy ANDs with permissive grants so presets never leak across
-- tenants; members read their tenant's presets, owners create/delete their own.

CREATE TABLE IF NOT EXISTS public.gw_studio_fx_presets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT current_tenant_id() REFERENCES public.gw_tenants(id),
  owner_user_id uuid NOT NULL DEFAULT auth.uid(),
  name          text NOT NULL,
  effects       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_studio_fx_presets ENABLE ROW LEVEL SECURITY;

-- Cross-tenant isolation (RESTRICTIVE — ANDs with every grant below).
DROP POLICY IF EXISTS fx_presets_tenant_isolation ON public.gw_studio_fx_presets;
CREATE POLICY fx_presets_tenant_isolation ON public.gw_studio_fx_presets
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Members read their tenant's presets (tenant scoping enforced above).
DROP POLICY IF EXISTS fx_presets_select ON public.gw_studio_fx_presets;
CREATE POLICY fx_presets_select ON public.gw_studio_fx_presets
  FOR SELECT TO authenticated USING (true);

-- Create your own.
DROP POLICY IF EXISTS fx_presets_insert ON public.gw_studio_fx_presets;
CREATE POLICY fx_presets_insert ON public.gw_studio_fx_presets
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- Delete your own.
DROP POLICY IF EXISTS fx_presets_delete ON public.gw_studio_fx_presets;
CREATE POLICY fx_presets_delete ON public.gw_studio_fx_presets
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS gw_studio_fx_presets_tenant_idx
  ON public.gw_studio_fx_presets (tenant_id, created_at DESC);
