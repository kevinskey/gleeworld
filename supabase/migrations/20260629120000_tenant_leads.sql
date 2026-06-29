-- Tenant leads — concierge intake form for prospects who tap "Become a
-- tenant" inside the demo. Kevin works the queue manually (no
-- auto-provisioning), and the lead row is the source of truth so leads
-- don't get lost in his inbox between email + SMS.
--
-- Public-write by design: the form posts via a service-role edge function
-- (tenant-intake) so anonymous demo users can submit without auth. The
-- function validates fields and rate-limits.

CREATE TABLE IF NOT EXISTS gw_tenant_leads (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  -- Where the lead came from. Today this is always 'demo', but future
  -- entry points (gleeworld.org pricing page, partner referrals) get
  -- their own slug so we can attribute conversion later.
  source_tenant_slug text NOT NULL DEFAULT 'demo',
  org_name           text NOT NULL,
  contact_name       text NOT NULL,
  email              text NOT NULL,
  phone              text,
  expected_students  integer,
  modules            text[] NOT NULL DEFAULT '{}',
  notes              text,
  -- Lifecycle the platform owner moves the lead through.
  status             text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
  -- Free-form notes from the platform owner after follow-up.
  owner_notes        text,
  -- Populated once the lead converts → links back to the provisioned tenant.
  provisioned_tenant_id uuid REFERENCES gw_tenants(id) ON DELETE SET NULL,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_tenant_leads_status_idx
  ON gw_tenant_leads (status, created_at DESC);

-- RLS: only platform super-admins (`is_super_admin`) can read/write
-- through the API. The intake edge function uses service-role so it
-- bypasses RLS entirely.
ALTER TABLE gw_tenant_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY gw_tenant_leads_super_read ON gw_tenant_leads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true));
CREATE POLICY gw_tenant_leads_super_write ON gw_tenant_leads FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true));
