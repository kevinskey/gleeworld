-- Canvas headless integration — Phase 1 foundations.
--
-- One or more Canvas instances act as the academic backend for GleeWorld
-- tenants who opt into a Canvas-backed Academy. GleeWorld owns the UI,
-- Canvas owns the data (courses, assignments, submissions, grades).
--
-- Schema additions:
--   • gw_canvas_instances  — registered Canvas servers we can talk to
--   • gw_tenant_canvas_accounts — tenant → Canvas sub-account binding
--   • gw_profiles.canvas_user_id — Canvas user id for each GleeWorld user
--   • gw_courses.canvas_course_id — Canvas course id for each GleeWorld course

-- ── Canvas instances ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gw_canvas_instances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text NOT NULL,                -- 'Black Music Scholar', 'Spelman Canvas', etc.
  base_url      text NOT NULL UNIQUE,         -- 'https://blackmusicscholar.com'
  admin_token   text NOT NULL,                -- Site-Admin access token (encrypted at rest is a Phase-2 polish)
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gw_canvas_instances ENABLE ROW LEVEL SECURITY;
-- Only super-admins read. Edge functions bypass with service-role.
CREATE POLICY gw_canvas_instances_super ON gw_canvas_instances FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true));

-- ── Tenant → Canvas sub-account binding ──────────────────────────────
CREATE TABLE IF NOT EXISTS gw_tenant_canvas_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES gw_tenants(id) ON DELETE CASCADE,
  canvas_instance_id  uuid NOT NULL REFERENCES gw_canvas_instances(id) ON DELETE RESTRICT,
  canvas_account_id   bigint NOT NULL,        -- Canvas's sub-account id
  is_active           boolean NOT NULL DEFAULT true,
  provisioned_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id),                          -- one Canvas account per tenant
  UNIQUE (canvas_instance_id, canvas_account_id)
);

CREATE INDEX IF NOT EXISTS gw_tenant_canvas_accounts_tenant_idx
  ON gw_tenant_canvas_accounts (tenant_id) WHERE is_active;

ALTER TABLE gw_tenant_canvas_accounts ENABLE ROW LEVEL SECURITY;
-- A tenant member can read their own binding (so the UI can decide
-- whether to show Canvas-backed Academy).
CREATE POLICY gw_tenant_canvas_accounts_member_read ON gw_tenant_canvas_accounts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_super_admin = true OR p.tenant_id = gw_tenant_canvas_accounts.tenant_id)
  ));

-- ── User mapping ─────────────────────────────────────────────────────
-- A GleeWorld user gets a corresponding Canvas user provisioned on
-- first entry into Academy. We store the Canvas user id here so we
-- don't have to look it up by email every call.
ALTER TABLE gw_profiles
  ADD COLUMN IF NOT EXISTS canvas_user_id bigint;

CREATE INDEX IF NOT EXISTS gw_profiles_canvas_user_idx
  ON gw_profiles (canvas_user_id) WHERE canvas_user_id IS NOT NULL;

-- ── Course mapping ───────────────────────────────────────────────────
-- A GleeWorld course (when on Canvas-backed Academy) is backed by a
-- Canvas course. The id here is the Canvas course id within the
-- bound sub-account.
ALTER TABLE gw_courses
  ADD COLUMN IF NOT EXISTS canvas_course_id bigint;

CREATE INDEX IF NOT EXISTS gw_courses_canvas_course_idx
  ON gw_courses (canvas_course_id) WHERE canvas_course_id IS NOT NULL;

-- ── Seed: register Black Music Scholar Canvas ────────────────────────
INSERT INTO gw_canvas_instances (label, base_url, admin_token)
VALUES (
  'Black Music Scholar',
  'https://blackmusicscholar.com',
  '3JwtY7tLDtrZUt47KQh6rBCRZMcyE6D8nJLnMmYNcmKkaXfu6urfemNEN9nrA8xH'
)
ON CONFLICT (base_url) DO UPDATE SET
  admin_token = EXCLUDED.admin_token,
  updated_at  = now();
