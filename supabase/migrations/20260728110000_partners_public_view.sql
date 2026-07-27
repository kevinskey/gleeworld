-- I1: Drop leaky public_active_read policy; replace with a view exposing
-- only storefront-safe columns (no stripe ids, contact email, timestamps).
-- useMyPartner (fixed C1) reads via gw_partners_self_read (user_id=auth.uid())
-- which is unaffected. Admin reads continue via gw_partners_admin_all.

DROP POLICY IF EXISTS gw_partners_public_active_read ON gw_partners;

CREATE OR REPLACE VIEW gw_partners_public AS
SELECT id, display_name, bio, website_url, logo_storage_path, status
FROM gw_partners
WHERE status = 'active';

GRANT SELECT ON gw_partners_public TO authenticated;
