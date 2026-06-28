-- LTI 1.3 Phase 1 — platform registration + Canvas user mapping.
--
-- Phase 1 scope: a Canvas admin registers GleeWorld as an LTI tool, gives
-- us their Issuer URL + Client ID + Deployment ID + JWK URI, we store
-- the row here, and students can launch into GleeWorld signed-in via the
-- OIDC flow. Each registered Canvas instance is bound to exactly ONE
-- GleeWorld tenant (the choir/school that bought the integration).
--
-- Phase 2+ (later migrations): grade passback (AGS), roster sync (NRPS),
-- deep linking, multi-tenant fan-out, admin UI.

-- ── Platforms ─────────────────────────────────────────────────────────
-- One row per registered Canvas instance. Manually inserted today by
-- a super-admin during onboarding; we'll add a UI later.
CREATE TABLE IF NOT EXISTS lti_platforms (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Canvas-side identity (all four come from Canvas's developer-key UI).
  issuer           text NOT NULL,           -- e.g. https://canvas.instructure.com
  client_id        text NOT NULL,           -- Canvas's developer key client_id
  deployment_id    text NOT NULL,           -- one platform can have multiple deployments
  auth_login_url   text NOT NULL,           -- Canvas's OIDC auth endpoint
  auth_token_url   text NOT NULL,           -- Canvas's OAuth token endpoint (used in Phase 2 for AGS)
  jwks_url         text NOT NULL,           -- where to fetch Canvas's signing keys
  -- GleeWorld-side binding.
  tenant_id        uuid NOT NULL REFERENCES gw_tenants(id) ON DELETE CASCADE,
  -- Bookkeeping.
  display_name     text,                    -- "Spelman Canvas", for the admin UI later
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- A platform is uniquely identified by (issuer, client_id, deployment_id)
  -- in the LTI 1.3 spec.
  UNIQUE (issuer, client_id, deployment_id)
);

CREATE INDEX IF NOT EXISTS lti_platforms_issuer_idx ON lti_platforms (issuer);
CREATE INDEX IF NOT EXISTS lti_platforms_tenant_idx ON lti_platforms (tenant_id);

ALTER TABLE lti_platforms ENABLE ROW LEVEL SECURITY;
-- Only super-admins read/write. Edge functions use service-role and bypass.
CREATE POLICY lti_platforms_super_admin ON lti_platforms FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true));

-- ── User links ────────────────────────────────────────────────────────
-- Maps an LTI sub (the Canvas user's stable GUID) to a GleeWorld user.
-- We dedupe on (platform_id, lti_sub) — the same Canvas user can have
-- different `sub` values across different platforms.
CREATE TABLE IF NOT EXISTS lti_user_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id  uuid NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
  lti_sub      text NOT NULL,             -- Canvas user GUID from the id_token `sub` claim
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_at_link text,                     -- what the email was when we linked, for audit
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_launch_at timestamptz,
  UNIQUE (platform_id, lti_sub)
);

CREATE INDEX IF NOT EXISTS lti_user_links_user_idx ON lti_user_links (user_id);

ALTER TABLE lti_user_links ENABLE ROW LEVEL SECURITY;
-- A user can read their own link rows; only service-role writes.
CREATE POLICY lti_user_links_own ON lti_user_links FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── OIDC state ────────────────────────────────────────────────────────
-- Short-lived storage for the OIDC state + nonce we mint at the
-- lti-oidc-init step. Cookies are unreliable inside Canvas iframes
-- (SameSite=None,Secure isn't honored everywhere); persisting to the DB
-- keyed by a random `state` value is the bulletproof path.
--
-- Rows auto-expire after 10 minutes via the cron-driven cleanup at the
-- bottom of this file.
CREATE TABLE IF NOT EXISTS lti_oidc_state (
  state         text PRIMARY KEY,         -- random 32-byte URL-safe
  nonce         text NOT NULL,            -- random 32-byte URL-safe
  platform_id   uuid NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
  target_link_uri text,                   -- where to land after launch
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lti_oidc_state_created_idx ON lti_oidc_state (created_at);

ALTER TABLE lti_oidc_state ENABLE ROW LEVEL SECURITY;
-- Edge functions use service-role; no authenticated access needed.

-- Cleanup helper — drop rows older than 10 minutes. Call from pg_cron
-- or a periodic edge function.
CREATE OR REPLACE FUNCTION lti_cleanup_oidc_state() RETURNS void
LANGUAGE sql AS $$
  DELETE FROM lti_oidc_state WHERE created_at < now() - interval '10 minutes';
$$;
