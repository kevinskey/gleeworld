-- Configurable absence/excuse form (per-tenant).
--
-- Directors run their own absence-form policies (which ensembles, which
-- conflict types, policy blurb, typed-name acknowledgment). Extend the
-- pre-event excuse flow so the member form mirrors the director's paper/
-- Microsoft form without hardcoding any tenant's options in code.
--
-- MUST apply BEFORE the frontend that reads it deploys.

-- ── New optional fields on submissions ───────────────────────────────

ALTER TABLE public.gw_pre_event_excuses
  ADD COLUMN IF NOT EXISTS ensemble text,
  ADD COLUMN IF NOT EXISTS conflict_type text,
  ADD COLUMN IF NOT EXISTS acknowledgment_name text;

-- excuse_requests is the primary table the member form writes and the
-- admin review reads; gw_pre_event_excuses is its legacy mirror.
ALTER TABLE public.excuse_requests
  ADD COLUMN IF NOT EXISTS ensemble text,
  ADD COLUMN IF NOT EXISTS conflict_type text,
  ADD COLUMN IF NOT EXISTS acknowledgment_name text;

-- ── Per-tenant form settings ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gw_excuse_form_settings (
  tenant_id uuid PRIMARY KEY DEFAULT current_tenant_id()
    REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  ensembles text[] NOT NULL DEFAULT '{}',
  conflict_types text[] NOT NULL DEFAULT '{}',
  policy_text text,
  require_acknowledgment boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION gw_excuse_form_settings_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_excuse_form_settings_fill_tenant_trg ON public.gw_excuse_form_settings;
CREATE TRIGGER gw_excuse_form_settings_fill_tenant_trg
  BEFORE INSERT OR UPDATE ON public.gw_excuse_form_settings
  FOR EACH ROW EXECUTE FUNCTION gw_excuse_form_settings_fill_tenant();

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE public.gw_excuse_form_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_excuse_form_settings;
CREATE POLICY tenant_isolation_restrict
  ON public.gw_excuse_form_settings
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Members read their tenant's form config; tenant admins write it.
-- Permissive so they compose with the restrictive tenant check above.

DROP POLICY IF EXISTS excuse_form_settings_read ON public.gw_excuse_form_settings;
CREATE POLICY excuse_form_settings_read
  ON public.gw_excuse_form_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS excuse_form_settings_admin_write ON public.gw_excuse_form_settings;
CREATE POLICY excuse_form_settings_admin_write
  ON public.gw_excuse_form_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
       WHERE p.user_id = auth.uid()
         AND (p.is_admin OR p.is_super_admin
              OR p.role IN ('admin', 'super_admin', 'super-admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
       WHERE p.user_id = auth.uid()
         AND (p.is_admin OR p.is_super_admin
              OR p.role IN ('admin', 'super_admin', 'super-admin'))
    )
  );
