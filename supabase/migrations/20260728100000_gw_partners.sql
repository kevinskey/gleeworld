-- Partner Marketplace foundation — gw_partners + is_partner flag + helpers.
--
-- Platform-global (NO tenant_id): a composer's storefront is one entity
-- regardless of which tenant subdomain a buyer is browsing on.

CREATE TABLE IF NOT EXISTS gw_partners (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name             text NOT NULL,
  bio                      text,
  website_url              text,
  contact_email            text,
  logo_storage_path        text,
  stripe_connect_id        text,
  stripe_charges_enabled   boolean NOT NULL DEFAULT false,
  stripe_payouts_enabled   boolean NOT NULL DEFAULT false,
  status                   text NOT NULL DEFAULT 'invited'
                           CHECK (status IN ('invited','onboarding','active','suspended')),
  invite_token             text UNIQUE,
  invited_at               timestamptz,
  activated_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_partners_status_idx ON gw_partners (status);
CREATE INDEX IF NOT EXISTS gw_partners_display_name_trgm
  ON gw_partners USING GIN (display_name gin_trgm_ops);

ALTER TABLE gw_profiles
  ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false;

-- Keep gw_profiles.is_partner in sync with gw_partners.status='active'.
CREATE OR REPLACE FUNCTION sync_is_partner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE gw_profiles SET is_partner = false WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  UPDATE gw_profiles
     SET is_partner = (NEW.status = 'active')
   WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_is_partner ON gw_partners;
CREATE TRIGGER trg_sync_is_partner
AFTER INSERT OR UPDATE OF status OR DELETE ON gw_partners
FOR EACH ROW EXECUTE FUNCTION sync_is_partner();

-- Helper: caller's partner id (or NULL if not a partner).
CREATE OR REPLACE FUNCTION my_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM gw_partners WHERE user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION my_partner_id() TO authenticated;

-- Whitelisted self-update. Partner cannot change status or stripe ids.
CREATE OR REPLACE FUNCTION partner_update_self(
  p_display_name       text,
  p_bio                text,
  p_website_url        text,
  p_contact_email      text,
  p_logo_storage_path  text
)
RETURNS gw_partners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated gw_partners;
BEGIN
  UPDATE gw_partners
     SET display_name       = COALESCE(p_display_name, display_name),
         bio                = p_bio,
         website_url        = p_website_url,
         contact_email      = p_contact_email,
         logo_storage_path  = p_logo_storage_path
   WHERE user_id = auth.uid()
   RETURNING * INTO updated;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not a partner' USING ERRCODE = '42501';
  END IF;
  RETURN updated;
END;
$$;
GRANT EXECUTE ON FUNCTION partner_update_self(text, text, text, text, text) TO authenticated;

-- RLS
ALTER TABLE gw_partners ENABLE ROW LEVEL SECURITY;

-- Public storefront read of active partners — limited columns via a view/RPC
-- later; policy is any authenticated user for active rows.
DROP POLICY IF EXISTS gw_partners_public_active_read ON gw_partners;
CREATE POLICY gw_partners_public_active_read
  ON gw_partners FOR SELECT TO authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS gw_partners_self_read ON gw_partners;
CREATE POLICY gw_partners_self_read
  ON gw_partners FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS gw_partners_admin_all ON gw_partners;
CREATE POLICY gw_partners_admin_all
  ON gw_partners FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  );

-- No direct INSERT/UPDATE/DELETE from partners — they go through
-- partner_update_self() (SECURITY DEFINER). Onboarding writes go
-- through partner-invite-redeem edge fn (service-role).
