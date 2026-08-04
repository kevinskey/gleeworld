-- Idempotent guard for Stripe webhook retries.
ALTER TABLE gw_partner_order_items
  DROP CONSTRAINT IF EXISTS gw_poi_order_score_uq;
ALTER TABLE gw_partner_order_items
  ADD CONSTRAINT gw_poi_order_score_uq UNIQUE (order_id, partner_score_id);
