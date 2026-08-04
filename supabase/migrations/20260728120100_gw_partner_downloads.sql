CREATE TABLE IF NOT EXISTS gw_partner_downloads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id   uuid NOT NULL REFERENCES gw_partner_order_items(id) ON DELETE CASCADE,
  downloaded_at   timestamptz NOT NULL DEFAULT now(),
  client_ip       inet,
  user_agent      text
);

CREATE INDEX IF NOT EXISTS gw_partner_downloads_item_idx
  ON gw_partner_downloads (order_item_id, downloaded_at DESC);

ALTER TABLE gw_partner_downloads ENABLE ROW LEVEL SECURITY;

-- Only the edge fn (service role) writes; buyers can read their own item's log.
DROP POLICY IF EXISTS gw_pd_buyer_read ON gw_partner_downloads;
CREATE POLICY gw_pd_buyer_read
  ON gw_partner_downloads FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1
            FROM gw_partner_order_items i
            JOIN gw_partner_orders o ON o.id = i.order_id
            WHERE i.id = gw_partner_downloads.order_item_id
              AND o.buyer_user_id = auth.uid())
  );

DROP POLICY IF EXISTS gw_pd_admin_all ON gw_partner_downloads;
CREATE POLICY gw_pd_admin_all
  ON gw_partner_downloads FOR ALL TO authenticated
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
