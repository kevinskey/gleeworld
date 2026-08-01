-- GW Sheet Music Store — featured selections + email-claimed partners.
-- Spec: docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md
--
-- Platform-global (NO tenant_id), same as the rest of the partner tables.

-- 1) Partners may now exist before their user signs in: admin creates the
--    row with contact_email; first sign-in with that email claims it.
--    UNIQUE(user_id) still holds (Postgres allows multiple NULLs).
ALTER TABLE gw_partners ALTER COLUMN user_id DROP NOT NULL;

-- 2) Storefront profile + featuring columns.
ALTER TABLE gw_partners
  ADD COLUMN IF NOT EXISTS owner_photo_storage_path text,
  ADD COLUMN IF NOT EXISTS history text,
  ADD COLUMN IF NOT EXISTS featured_order integer;

ALTER TABLE gw_partner_scores
  ADD COLUMN IF NOT EXISTS partner_featured_order integer,
  ADD COLUMN IF NOT EXISTS gw_featured_order integer;

CREATE INDEX IF NOT EXISTS gw_partners_featured_idx
  ON gw_partners (featured_order) WHERE featured_order IS NOT NULL;
CREATE INDEX IF NOT EXISTS gw_partner_scores_gw_featured_idx
  ON gw_partner_scores (gw_featured_order) WHERE gw_featured_order IS NOT NULL;

-- 3) gw_featured_order is platform-curation-only (super-admin only — partners
--    cannot feature themselves and tenant admins don't get a pass either).
--    Partners have a broad owner_all UPDATE policy on their own score rows,
--    so guard the column with a trigger instead of a policy. Service-role
--    writes (edge fns) never touch the column, so IS DISTINCT FROM lets them
--    through. TG_OP is branched explicitly (rather than relying on OR
--    short-circuit) because OLD is unassigned during INSERT.
CREATE OR REPLACE FUNCTION guard_gw_featured_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_touched boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_touched := NEW.gw_featured_order IS NOT NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_touched := NEW.gw_featured_order IS DISTINCT FROM OLD.gw_featured_order;
  END IF;

  IF v_touched THEN
    IF NOT EXISTS (SELECT 1 FROM gw_profiles p
                   WHERE p.user_id = auth.uid()
                     AND p.is_super_admin = true) THEN
      RAISE EXCEPTION 'gw_featured_order is super-admin only' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_gw_featured_order ON gw_partner_scores;
CREATE TRIGGER trg_guard_gw_featured_order
BEFORE INSERT OR UPDATE ON gw_partner_scores
FOR EACH ROW EXECUTE FUNCTION guard_gw_featured_order();

-- 3b) featured_order on gw_partners (storefront-level curation) gets the
--     same super-admin-only guard. Partners can update their own row via
--     partner_update_self(), but that RPC's whitelist never includes this
--     column — this trigger is belt-and-suspenders against any future direct
--     UPDATE path (e.g. a broadened owner policy).
CREATE OR REPLACE FUNCTION guard_partner_featured_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_touched boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_touched := NEW.featured_order IS NOT NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_touched := NEW.featured_order IS DISTINCT FROM OLD.featured_order;
  END IF;

  IF v_touched THEN
    IF NOT EXISTS (SELECT 1 FROM gw_profiles p
                   WHERE p.user_id = auth.uid()
                     AND p.is_super_admin = true) THEN
      RAISE EXCEPTION 'featured_order is super-admin only' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_partner_featured_order ON gw_partners;
CREATE TRIGGER trg_guard_partner_featured_order
BEFORE INSERT OR UPDATE ON gw_partners
FOR EACH ROW EXECUTE FUNCTION guard_partner_featured_order();

-- 4) Email-driven claim: link the signed-in user to an unclaimed partner
--    row whose contact_email matches their auth email (case-insensitive).
--    Never re-links a partner away from an established user; if the caller
--    is already a partner, just return that id. Oldest matching row wins
--    if an admin accidentally created duplicates.
CREATE OR REPLACE FUNCTION partner_claim_by_email()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_id    uuid;
BEGIN
  SELECT id INTO v_id FROM gw_partners WHERE user_id = auth.uid();
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE gw_partners
     SET user_id = auth.uid(),
         status  = CASE WHEN status = 'invited' THEN 'onboarding' ELSE status END
   WHERE id = (
     SELECT id FROM gw_partners
      WHERE user_id IS NULL
        AND lower(contact_email) = lower(v_email)
      ORDER BY created_at
      LIMIT 1
   )
     AND user_id IS NULL
   RETURNING id INTO v_id;

  RETURN v_id;  -- NULL when no match: caller is simply not a partner.
END;
$$;
GRANT EXECUTE ON FUNCTION partner_claim_by_email() TO authenticated;

-- 5) Widen the whitelisted self-update with owner photo + history.
--    Drop the old signature first — two overloads would make PostgREST
--    rpc('partner_update_self') ambiguous.
DROP FUNCTION IF EXISTS partner_update_self(text, text, text, text, text);

CREATE OR REPLACE FUNCTION partner_update_self(
  p_display_name             text,
  p_bio                      text,
  p_website_url              text,
  p_contact_email            text,
  p_logo_storage_path        text,
  p_owner_photo_storage_path text,
  p_history                  text
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
     SET display_name             = COALESCE(p_display_name, display_name),
         bio                      = p_bio,
         website_url              = p_website_url,
         contact_email            = p_contact_email,
         logo_storage_path        = p_logo_storage_path,
         owner_photo_storage_path = p_owner_photo_storage_path,
         history                  = p_history
   WHERE user_id = auth.uid()
   RETURNING * INTO updated;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not a partner' USING ERRCODE = '42501';
  END IF;
  RETURN updated;
END;
$$;
GRANT EXECUTE ON FUNCTION partner_update_self(text, text, text, text, text, text, text) TO authenticated;

-- 6) Public storefront view: append the new columns (trailing appends keep
--    CREATE OR REPLACE legal).
CREATE OR REPLACE VIEW gw_partners_public AS
SELECT id, display_name, bio, website_url, logo_storage_path, status,
       owner_photo_storage_path, history, featured_order
FROM gw_partners
WHERE status = 'active';

GRANT SELECT ON gw_partners_public TO authenticated;
