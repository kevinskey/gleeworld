-- supabase/migrations/20260730000001_travel_permission_slips.sql

-- 1. gw_branding_settings K-12 flag
ALTER TABLE gw_branding_settings
  ADD COLUMN IF NOT EXISTS k12_ensemble BOOLEAN NOT NULL DEFAULT false;

-- 2. gw_guardians
CREATE TABLE gw_guardians (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL DEFAULT current_tenant_id(),
  student_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  relationship     TEXT NOT NULL CHECK (relationship IN ('mother','father','guardian','other')),
  is_primary       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX gw_guardians_one_primary
  ON gw_guardians(student_user_id) WHERE is_primary = true;
CREATE INDEX gw_guardians_student ON gw_guardians(student_user_id);
CREATE INDEX gw_guardians_tenant  ON gw_guardians(tenant_id);
ALTER TABLE gw_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_guardians FORCE ROW LEVEL SECURITY;

CREATE POLICY guardians_tenant_isolation ON gw_guardians
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY guardians_teacher_manage ON gw_guardians
  FOR ALL
  USING (is_current_user_tour_manager() OR EXISTS (
    SELECT 1 FROM app_roles r
    WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin','super-admin','admin')
      AND COALESCE(r.is_active, true) = true
  ))
  WITH CHECK (true);

CREATE POLICY guardians_student_read ON gw_guardians
  FOR SELECT USING (student_user_id = auth.uid());

CREATE POLICY guardians_student_update ON gw_guardians
  FOR UPDATE USING (student_user_id = auth.uid())
  WITH CHECK (student_user_id = auth.uid());

CREATE TRIGGER gw_guardians_set_tenant_id
  BEFORE INSERT ON gw_guardians
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

CREATE TRIGGER gw_guardians_set_updated_at
  BEFORE UPDATE ON gw_guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. gw_permission_slips
CREATE TABLE gw_permission_slips (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL DEFAULT current_tenant_id(),
  tour_id                 UUID NOT NULL REFERENCES gw_tour_events(id) ON DELETE CASCADE,
  student_user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','sent','signed','expired','revoked')),
  slip_token_jti          UUID,
  sent_to_guardian_id     UUID REFERENCES gw_guardians(id) ON DELETE SET NULL,
  sent_at                 TIMESTAMPTZ,
  signed_by_guardian_id   UUID REFERENCES gw_guardians(id) ON DELETE SET NULL,
  signed_at               TIMESTAMPTZ,
  signature_storage_path  TEXT,
  signature_audit         JSONB,
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tour_id, student_user_id)
);
CREATE INDEX perm_slips_tenant_tour ON gw_permission_slips(tenant_id, tour_id);
CREATE INDEX perm_slips_status ON gw_permission_slips(status);
CREATE INDEX perm_slips_signed_at ON gw_permission_slips(signed_at DESC) WHERE status='signed';

ALTER TABLE gw_permission_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_permission_slips FORCE ROW LEVEL SECURITY;

CREATE POLICY slips_tenant_isolation ON gw_permission_slips
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY slips_teacher_manage ON gw_permission_slips
  FOR ALL
  USING (is_current_user_tour_manager() OR EXISTS (
    SELECT 1 FROM app_roles r
    WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin','super-admin','admin')
      AND COALESCE(r.is_active, true) = true
  ))
  WITH CHECK (true);

CREATE POLICY slips_student_read ON gw_permission_slips
  FOR SELECT USING (student_user_id = auth.uid());

CREATE TRIGGER gw_permission_slips_set_tenant_id
  BEFORE INSERT ON gw_permission_slips
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

CREATE TRIGGER gw_permission_slips_set_updated_at
  BEFORE UPDATE ON gw_permission_slips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Auto-create slip on roster insert (K-12 tenants only)
CREATE OR REPLACE FUNCTION gw_create_permission_slip_for_roster()
RETURNS TRIGGER AS $$
DECLARE
  is_k12 BOOLEAN;
BEGIN
  SELECT COALESCE(k12_ensemble, false) INTO is_k12
  FROM gw_branding_settings
  WHERE tenant_id = current_tenant_id();
  IF is_k12 THEN
    INSERT INTO gw_permission_slips (tour_id, student_user_id)
    VALUES (NEW.tour_id, NEW.user_id)
    ON CONFLICT (tour_id, student_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER gw_tour_roster_create_slip
  AFTER INSERT ON gw_tour_roster
  FOR EACH ROW EXECUTE FUNCTION gw_create_permission_slip_for_roster();

-- 5. Private storage bucket for signature PNGs
INSERT INTO storage.buckets (id, name, public)
VALUES ('permission-slips','permission-slips',false)
ON CONFLICT (id) DO NOTHING;
