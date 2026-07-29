CREATE TABLE IF NOT EXISTS gw_partner_invites (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  text NOT NULL,
  display_name           text,
  invited_by             uuid REFERENCES auth.users(id),
  token                  text NOT NULL UNIQUE,
  expires_at             timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  redeemed_at            timestamptz,
  redeemed_by_user_id    uuid REFERENCES auth.users(id),
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_partner_invites_email_idx ON gw_partner_invites (email);
CREATE INDEX IF NOT EXISTS gw_partner_invites_open_idx  ON gw_partner_invites (expires_at) WHERE redeemed_at IS NULL;

ALTER TABLE gw_partner_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_partner_invites_admin_all ON gw_partner_invites;
CREATE POLICY gw_partner_invites_admin_all
  ON gw_partner_invites FOR ALL TO authenticated
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
-- Non-admins never SELECT invites. Redemption reads happen via
-- edge fn using the service role.
