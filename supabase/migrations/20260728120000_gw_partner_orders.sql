-- Partner marketplace Sub-plan 2: orders + line items.
--
-- Platform-global by design (matches Sub-plan 1 pattern). Buyer's tenant
-- context doesn't matter — a purchase is between the buyer, GleeWorld,
-- and one partner via Stripe Connect.

CREATE TABLE IF NOT EXISTS gw_partner_orders (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id                 uuid NOT NULL DEFAULT auth.uid()
                                REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id      text UNIQUE,
  stripe_checkout_session_id    text UNIQUE,
  subtotal_cents                integer NOT NULL,
  platform_fee_cents            integer NOT NULL,
  currency                      text NOT NULL DEFAULT 'USD',
  status                        text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','paid','failed','refunded','partial_refund')),
  paid_at                       timestamptz,
  refunded_at                   timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_partner_orders_buyer_idx
  ON gw_partner_orders (buyer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_partner_orders_status_idx
  ON gw_partner_orders (status) WHERE status IN ('pending','paid');

ALTER TABLE gw_partner_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_po_buyer_all ON gw_partner_orders;
CREATE POLICY gw_po_buyer_all
  ON gw_partner_orders FOR ALL TO authenticated
  USING (buyer_user_id = auth.uid())
  WITH CHECK (buyer_user_id = auth.uid());

DROP POLICY IF EXISTS gw_po_admin_all ON gw_partner_orders;
CREATE POLICY gw_po_admin_all
  ON gw_partner_orders FOR ALL TO authenticated
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

-- gw_partner_order_items: one row per purchased score.
CREATE TABLE IF NOT EXISTS gw_partner_order_items (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                      uuid NOT NULL REFERENCES gw_partner_orders(id) ON DELETE CASCADE,
  partner_score_id              uuid NOT NULL REFERENCES gw_partner_scores(id),
  partner_id                    uuid NOT NULL REFERENCES gw_partners(id),
  price_cents                   integer NOT NULL,
  platform_fee_cents            integer NOT NULL,
  partner_payout_cents          integer NOT NULL,
  watermarked_storage_path      text,
  entitlement_id                uuid REFERENCES gw_store_entitlements(id) ON DELETE SET NULL,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_partner_order_items_order_idx
  ON gw_partner_order_items (order_id);
CREATE INDEX IF NOT EXISTS gw_partner_order_items_partner_idx
  ON gw_partner_order_items (partner_id, created_at DESC);

ALTER TABLE gw_partner_order_items ENABLE ROW LEVEL SECURITY;

-- Buyers read items whose parent order is theirs.
DROP POLICY IF EXISTS gw_poi_buyer_read ON gw_partner_order_items;
CREATE POLICY gw_poi_buyer_read
  ON gw_partner_order_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_partner_orders o
            WHERE o.id = gw_partner_order_items.order_id
              AND o.buyer_user_id = auth.uid())
  );

-- Partners read items for their own scores (revenue reporting).
DROP POLICY IF EXISTS gw_poi_partner_read ON gw_partner_order_items;
CREATE POLICY gw_poi_partner_read
  ON gw_partner_order_items FOR SELECT TO authenticated
  USING (partner_id = my_partner_id());

-- Admin all.
DROP POLICY IF EXISTS gw_poi_admin_all ON gw_partner_order_items;
CREATE POLICY gw_poi_admin_all
  ON gw_partner_order_items FOR ALL TO authenticated
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
