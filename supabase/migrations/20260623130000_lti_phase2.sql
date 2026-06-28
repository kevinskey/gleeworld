-- LTI 1.3 Phase 2 — Assignment & Grade Services (AGS) + Names & Roles
-- Provisioning Service (NRPS) + JWKS support.
--
-- We don't reach back to Canvas from Phase 1 — every byte flows
-- Canvas → us. Phase 2 flips that: GleeWorld now signs requests TO
-- Canvas using the tool's RSA key (stored in env LTI_PRIVATE_KEY).
-- That lets us post grades back and pull rosters.
--
-- New rows captured at launch time:
--   • AGS endpoint + lineitem URLs (which lineitem to score against)
--   • NRPS endpoint (which roster URL to call)
--   • The Canvas course / context binding (so a grade or roster pull
--     can find the right GleeWorld record without re-launching)

-- ── Per-launch resource context ─────────────────────────────────────────
-- One row per (platform, Canvas context_id). Captures the endpoints
-- Canvas hands us at launch time so a later background job can call
-- them without needing a fresh launch.
CREATE TABLE IF NOT EXISTS lti_context_links (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id        uuid NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
  -- Canvas-side identifiers from the launch JWT.
  context_id         text NOT NULL,           -- course GUID (the "course" the link belongs to)
  context_title      text,                    -- pretty name, e.g. "MUS 101 Spring 2026"
  resource_link_id   text,                    -- the specific link the user clicked
  -- AGS endpoint claim (https://purl.imsglobal.org/spec/lti-ags/claim/endpoint)
  ags_lineitems_url  text,                    -- list/create lineitems
  ags_lineitem_url   text,                    -- when the launch is bound to a single lineitem
  ags_scopes         text[],                  -- granted AGS scopes
  -- NRPS endpoint claim (https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice)
  nrps_context_memberships_url text,
  -- GleeWorld-side binding. Either points at a gw_section if the
  -- tenant has sections, otherwise lives at the tenant root.
  tenant_id          uuid NOT NULL REFERENCES gw_tenants(id) ON DELETE CASCADE,
  -- Bookkeeping.
  last_launch_at     timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_id, context_id)
);

CREATE INDEX IF NOT EXISTS lti_context_links_tenant_idx ON lti_context_links (tenant_id);

ALTER TABLE lti_context_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY lti_context_links_tenant_read ON lti_context_links FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_super_admin = true OR p.tenant_id = lti_context_links.tenant_id)
  ));

-- ── Grade line items ────────────────────────────────────────────────────
-- Maps a Canvas AGS lineitem to a GleeWorld gradable thing (an
-- assignment, a practice take, a sight-singing exercise, etc.). When
-- the teacher grades the GleeWorld item, the lti-grade-push function
-- looks up the matching row and posts a score to the lineitem URL.
CREATE TABLE IF NOT EXISTS lti_grade_lineitems (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context_link_id    uuid NOT NULL REFERENCES lti_context_links(id) ON DELETE CASCADE,
  lineitem_url       text NOT NULL,           -- Canvas-supplied; absolute
  resource_type      text NOT NULL,           -- 'practice_take' | 'assignment' | 'exercise' | ...
  resource_id        uuid NOT NULL,           -- FK isn't enforced since type varies
  score_maximum      numeric NOT NULL DEFAULT 100,
  label              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (context_link_id, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS lti_grade_lineitems_resource_idx
  ON lti_grade_lineitems (resource_type, resource_id);

ALTER TABLE lti_grade_lineitems ENABLE ROW LEVEL SECURITY;
-- No direct user access; edge functions handle this with service-role.

-- ── Optional: Capture AGS / NRPS endpoints directly on lti_user_links ──
-- Convenience columns so a per-user score push doesn't always have to
-- join through lti_context_links.
ALTER TABLE lti_user_links
  ADD COLUMN IF NOT EXISTS last_context_id text,
  ADD COLUMN IF NOT EXISTS last_lineitem_url text,
  ADD COLUMN IF NOT EXISTS last_nrps_url text;
