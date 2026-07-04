-- Stripe hardening (2026-07-04 audit)
--
-- 1) The 15 "Service role full access on <table>" policies were created
--    without a TO clause, so they applied to PUBLIC — every role,
--    including anon/authenticated. Combined with Supabase's default
--    table grants, gw_webhook_events (raw Stripe payloads: emails,
--    names, amounts) was readable and writable by any visitor through
--    PostgREST. Recreate each policy scoped to service_role only.
--    (service_role bypasses RLS anyway; the policy is belt-and-braces.)
--
-- 2) gw_webhook_events additionally loses all anon/authenticated table
--    grants — no client has any business touching the webhook audit log.
--
-- 3) Unique constraints the webhook code already assumes: the edge
--    function upserts with onConflict targets that had no matching
--    constraint (Postgres 42P10 error on every conflict), and event-id
--    dedupe needs a real UNIQUE. All affected tables are empty in
--    production (verified 2026-07-04), so these are safe to add.
--
-- 4) Index for the subscription-webhook fallback lookup.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_admin_audit_log','gw_discount_codes','gw_disputes','gw_feature_flags',
    'gw_inventory_movements','gw_package_presets','gw_payments','gw_refunds',
    'gw_shipment_items','gw_shipments','gw_shipping_settings','gw_store_settings',
    'gw_tax_regions','gw_user_message_history','gw_webhook_events'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                   'Service role full access on ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      'service_role_only', t);
  END LOOP;
END $$;

REVOKE ALL ON public.gw_webhook_events FROM anon, authenticated;

-- Dedupe / upsert-target constraints (tables verified empty in prod).
-- Idempotent: skip any that already exist (some predate this migration).
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT * FROM (VALUES
    ('gw_webhook_events','gw_webhook_events_event_id_key','event_id'),
    ('gw_payments','gw_payments_order_id_key','order_id'),
    ('gw_refunds','gw_refunds_stripe_refund_id_key','stripe_refund_id'),
    ('gw_orders','gw_orders_stripe_session_id_key','stripe_session_id'),
    ('gw_orders','gw_orders_stripe_payment_intent_id_key','stripe_payment_intent_id')
  ) AS v(tbl, con, col)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c.con) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (%I)',
                     c.tbl, c.con, c.col);
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_gw_tenant_subs_stripe_sub
  ON public.gw_tenant_subscriptions (stripe_subscription_id);
