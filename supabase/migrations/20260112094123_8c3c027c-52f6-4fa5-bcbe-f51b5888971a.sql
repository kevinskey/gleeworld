-- =============================================
-- PHASE 1: Merch Store E-Commerce Backend Tables
-- =============================================

-- 1. Extend gw_orders with additional fields (if not exists)
ALTER TABLE gw_orders 
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'partial', 'fulfilled')),
ADD COLUMN IF NOT EXISTS discount_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';

-- 2. Shipments table (EasyPost)
CREATE TABLE IF NOT EXISTS gw_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES gw_orders(id) ON DELETE CASCADE,
  easypost_shipment_id TEXT,
  selected_rate_id TEXT,
  carrier TEXT,
  service TEXT,
  tracking_code TEXT,
  tracking_url TEXT,
  label_url TEXT,
  cost NUMERIC(10,2),
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'rated', 'label_purchased', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'refunded', 'canceled')),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Shipment Items (partial fulfillment support)
CREATE TABLE IF NOT EXISTS gw_shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES gw_shipments(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES gw_order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Shipping Settings (singleton)
CREATE TABLE IF NOT EXISTS gw_shipping_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  origin_address JSONB,
  allowed_carriers JSONB,
  allowed_services JSONB,
  default_insurance_amount NUMERIC(10,2),
  signature_required_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default shipping settings
INSERT INTO gw_shipping_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 5. Package Presets
CREATE TABLE IF NOT EXISTS gw_package_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  length NUMERIC(6,2) NOT NULL,
  width NUMERIC(6,2) NOT NULL,
  height NUMERIC(6,2) NOT NULL,
  weight NUMERIC(8,2) NOT NULL,
  dimension_unit TEXT DEFAULT 'in',
  weight_unit TEXT DEFAULT 'oz',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Payments table (Stripe)
CREATE TABLE IF NOT EXISTS gw_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES gw_orders(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  status TEXT DEFAULT 'requires_payment' CHECK (status IN ('requires_payment', 'processing', 'succeeded', 'canceled', 'failed')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  payment_method TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Refunds table
CREATE TABLE IF NOT EXISTS gw_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES gw_orders(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES gw_payments(id) ON DELETE SET NULL,
  stripe_refund_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Disputes table
CREATE TABLE IF NOT EXISTS gw_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_dispute_id TEXT UNIQUE,
  order_id UUID REFERENCES gw_orders(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'needs_response',
  evidence_due_by TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Discount Codes
CREATE TABLE IF NOT EXISTS gw_discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed', 'free_shipping')),
  value NUMERIC(10,2) NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  min_subtotal NUMERIC(10,2) DEFAULT 0,
  usage_limit INTEGER,
  per_customer_limit INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Tax Regions
CREATE TABLE IF NOT EXISTS gw_tax_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_key TEXT UNIQUE NOT NULL,
  region_name TEXT NOT NULL,
  rate NUMERIC(5,4) NOT NULL,
  shipping_taxable BOOLEAN DEFAULT false,
  digital_taxable BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Inventory Movements
CREATE TABLE IF NOT EXISTS gw_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES gw_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES gw_product_variants(id) ON DELETE SET NULL,
  delta_qty INTEGER NOT NULL,
  reason TEXT CHECK (reason IN ('sale', 'refund', 'return', 'adjustment', 'restock')),
  ref_order_id UUID REFERENCES gw_orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Admin Audit Log
CREATE TABLE IF NOT EXISTS gw_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_data JSONB,
  after_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Webhook Events
CREATE TABLE IF NOT EXISTS gw_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'easypost')),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'error')),
  error_message TEXT
);

-- 14. Store Settings
CREATE TABLE IF NOT EXISTS gw_store_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name TEXT DEFAULT 'GleeWorld Store',
  store_email TEXT,
  support_email TEXT,
  default_currency TEXT DEFAULT 'usd',
  stripe_mode TEXT DEFAULT 'test' CHECK (stripe_mode IN ('test', 'live')),
  digital_download_expiry_days INTEGER DEFAULT 7,
  digital_max_downloads INTEGER DEFAULT 3,
  free_shipping_threshold NUMERIC(10,2),
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default store settings
INSERT INTO gw_store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 15. Feature Flags
CREATE TABLE IF NOT EXISTS gw_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert subscriptions feature flag (disabled by default)
INSERT INTO gw_feature_flags (flag_key, is_enabled, description) 
VALUES ('subscriptions', false, 'Enable subscriptions tab in store management')
ON CONFLICT (flag_key) DO NOTHING;

-- Enable RLS on all new tables
ALTER TABLE gw_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_shipping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_package_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_tax_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access (service role bypass)
CREATE POLICY "Service role full access on gw_shipments" ON gw_shipments FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_shipment_items" ON gw_shipment_items FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_shipping_settings" ON gw_shipping_settings FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_package_presets" ON gw_package_presets FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_payments" ON gw_payments FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_refunds" ON gw_refunds FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_disputes" ON gw_disputes FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_discount_codes" ON gw_discount_codes FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_tax_regions" ON gw_tax_regions FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_inventory_movements" ON gw_inventory_movements FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_admin_audit_log" ON gw_admin_audit_log FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_webhook_events" ON gw_webhook_events FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_store_settings" ON gw_store_settings FOR ALL USING (true);
CREATE POLICY "Service role full access on gw_feature_flags" ON gw_feature_flags FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gw_shipments_order_id ON gw_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_gw_shipments_status ON gw_shipments(status);
CREATE INDEX IF NOT EXISTS idx_gw_payments_order_id ON gw_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_gw_payments_stripe_intent ON gw_payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_gw_refunds_order_id ON gw_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_gw_discount_codes_code ON gw_discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_gw_inventory_movements_product ON gw_inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_gw_webhook_events_event_id ON gw_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_gw_webhook_events_provider ON gw_webhook_events(provider);

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_gw_shipments_updated_at ON gw_shipments;
CREATE TRIGGER update_gw_shipments_updated_at BEFORE UPDATE ON gw_shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gw_shipping_settings_updated_at ON gw_shipping_settings;
CREATE TRIGGER update_gw_shipping_settings_updated_at BEFORE UPDATE ON gw_shipping_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gw_package_presets_updated_at ON gw_package_presets;
CREATE TRIGGER update_gw_package_presets_updated_at BEFORE UPDATE ON gw_package_presets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gw_payments_updated_at ON gw_payments;
CREATE TRIGGER update_gw_payments_updated_at BEFORE UPDATE ON gw_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gw_disputes_updated_at ON gw_disputes;
CREATE TRIGGER update_gw_disputes_updated_at BEFORE UPDATE ON gw_disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gw_discount_codes_updated_at ON gw_discount_codes;
CREATE TRIGGER update_gw_discount_codes_updated_at BEFORE UPDATE ON gw_discount_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gw_tax_regions_updated_at ON gw_tax_regions;
CREATE TRIGGER update_gw_tax_regions_updated_at BEFORE UPDATE ON gw_tax_regions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gw_store_settings_updated_at ON gw_store_settings;
CREATE TRIGGER update_gw_store_settings_updated_at BEFORE UPDATE ON gw_store_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gw_feature_flags_updated_at ON gw_feature_flags;
CREATE TRIGGER update_gw_feature_flags_updated_at BEFORE UPDATE ON gw_feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();