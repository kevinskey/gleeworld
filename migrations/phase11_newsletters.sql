-- Phase 11: branded multi-section newsletters in Communications hub.

BEGIN;

CREATE TABLE IF NOT EXISTS public.gw_newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  title text NOT NULL,
  subject text NOT NULL,
  header_image_url text,
  intro text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  footer text,
  recipient_group text NOT NULL DEFAULT 'students' CHECK (recipient_group IN ('all','students','admins','fans')),
  custom_recipients text[],
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent','failed')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_newsletters_tenant_idx ON public.gw_newsletters(tenant_id);
CREATE INDEX IF NOT EXISTS gw_newsletters_status_idx ON public.gw_newsletters(status);
CREATE INDEX IF NOT EXISTS gw_newsletters_scheduled_idx ON public.gw_newsletters(scheduled_for) WHERE status = 'scheduled';

DROP TRIGGER IF EXISTS set_tenant_id ON public.gw_newsletters;
CREATE TRIGGER set_tenant_id BEFORE INSERT ON public.gw_newsletters
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_jwt();

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_updated_at ON public.gw_newsletters;
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.gw_newsletters
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.gw_newsletters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_newsletters;
CREATE POLICY tenant_isolation_restrict ON public.gw_newsletters AS RESTRICTIVE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS admins_all ON public.gw_newsletters;
CREATE POLICY admins_all ON public.gw_newsletters FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin)))
  WITH CHECK (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin)));

COMMIT;
