-- Pitch matching practice — records one row per attempt.
-- Tenant-scoped (student practice happens in the student's tenant context)
-- but individual attempt rows belong to the user, not the tenant. We follow
-- the same shape as other academy attempt tables: tenant_id set by trigger,
-- user_id enforces row ownership via RLS.

CREATE TABLE IF NOT EXISTS gw_pitch_match_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants(id),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice         text NOT NULL CHECK (voice IN ('soprano','alto','tenor','bass')),
  target_midi   integer NOT NULL,
  sung_midi     integer,                -- NULL when nothing intelligible was captured
  cents_off     integer,                -- NULL when sung_midi is NULL
  matched       boolean NOT NULL DEFAULT false,
  held_ms       integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_pitch_match_attempts_user_idx
  ON gw_pitch_match_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_pitch_match_attempts_tenant_idx
  ON gw_pitch_match_attempts (tenant_id, created_at DESC);

ALTER TABLE gw_pitch_match_attempts ENABLE ROW LEVEL SECURITY;

-- Tenant isolation (RESTRICTIVE) — matches the platform-wide multi-tenant
-- pattern; the BEFORE INSERT trigger below sets tenant_id if missing.
DROP POLICY IF EXISTS gw_pitch_match_attempts_tenant_iso ON gw_pitch_match_attempts;
CREATE POLICY gw_pitch_match_attempts_tenant_iso
  ON gw_pitch_match_attempts AS RESTRICTIVE
  FOR ALL TO authenticated, anon
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS gw_pitch_match_attempts_self_all ON gw_pitch_match_attempts;
CREATE POLICY gw_pitch_match_attempts_self_all
  ON gw_pitch_match_attempts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS gw_pitch_match_attempts_teacher_read ON gw_pitch_match_attempts;
CREATE POLICY gw_pitch_match_attempts_teacher_read
  ON gw_pitch_match_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  );

-- Default tenant_id via existing helper (only fires if client omits it).
DROP TRIGGER IF EXISTS trg_pitch_match_tenant_default ON gw_pitch_match_attempts;
CREATE TRIGGER trg_pitch_match_tenant_default
  BEFORE INSERT ON gw_pitch_match_attempts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_default();
