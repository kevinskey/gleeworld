-- Box Office ticketing — Phase A schema.
--
-- A tenant-scoped add-on for selling tickets to a tenant's own concerts.
-- Two money flows stay completely separate:
--
--   1. Tenant -> GleeWorld (SaaS add-on). Billed via the existing
--      gw_billing_modules + gw_tenant_subscriptions pipeline, so a row
--      in gw_tenant_subscriptions(module_id='box_office') is the
--      authoritative entitlement. No new "box_office_enabled" flag.
--
--   2. Concert buyer -> tenant (we take 0%). Direct charges on the
--      tenant's own Stripe Connect (Standard) account. NO application
--      fee. GleeWorld never custodies ticket revenue and has no
--      refund / chargeback exposure.
--
-- A "ticketable event" is just an existing calendar row in gw_events
-- with at least one gw_ticket_tiers row attached. This piggybacks on
-- the calendar so we don't duplicate venue / date / title across two
-- tables, and the same event automatically lands on the public
-- calendar view.
--
-- Migration is idempotent — most of the schema was created by an
-- earlier abandoned ticketing pass and is left in place.

-- ── Stripe Connect on the tenant ───────────────────────────────────────
-- stripe_account_id holds only the Connected account id (acct_*). The
-- charges_enabled / payouts_enabled mirrors come from the account.updated
-- Connect webhook so the UI can show a clear "finish Stripe setup" state
-- without round-tripping to Stripe on every page load.
ALTER TABLE public.gw_tenants
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT false;

-- ── Ticket tiers / orders / tickets / checkins ─────────────────────────
-- These were created by an earlier ticketing pass. Re-asserting here so
-- the migration file is the authoritative description even when the DB
-- already has the tables. Idempotent: CREATE TABLE IF NOT EXISTS plus
-- DROP POLICY IF EXISTS + CREATE POLICY for the RLS.

CREATE TABLE IF NOT EXISTS public.gw_ticket_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.gw_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  quantity_total INTEGER NOT NULL CHECK (quantity_total > 0),
  quantity_sold INTEGER NOT NULL DEFAULT 0
    CHECK (quantity_sold >= 0 AND quantity_sold <= quantity_total),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gw_ticket_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.gw_events(id) ON DELETE RESTRICT,
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'refunded', 'failed', 'comp')),
  access_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gw_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.gw_ticket_orders(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.gw_ticket_tiers(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES public.gw_events(id) ON DELETE RESTRICT,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'valid'
    CHECK (status IN ('valid', 'redeemed', 'void')),
  redeemed_at TIMESTAMP WITH TIME ZONE,
  is_comp BOOLEAN NOT NULL DEFAULT false,
  holder_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gw_ticket_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL UNIQUE REFERENCES public.gw_tickets(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS gw_ticket_tiers_event_idx       ON public.gw_ticket_tiers (event_id, sort_order);
CREATE INDEX IF NOT EXISTS gw_ticket_orders_tenant_status_idx ON public.gw_ticket_orders (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_tickets_order_idx            ON public.gw_tickets (order_id);
CREATE INDEX IF NOT EXISTS gw_tickets_event_status_idx     ON public.gw_tickets (event_id, status);
CREATE INDEX IF NOT EXISTS gw_ticket_checkins_tenant_idx   ON public.gw_ticket_checkins (tenant_id, checked_in_at DESC);

-- ── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.gw_ticket_tiers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_ticket_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_tickets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_ticket_checkins  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_ticket_tiers;
DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_ticket_orders;
DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_tickets;
DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_ticket_checkins;

CREATE POLICY tenant_isolation_restrict ON public.gw_ticket_tiers AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_restrict ON public.gw_ticket_orders AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_restrict ON public.gw_tickets AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_restrict ON public.gw_ticket_checkins AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Anon visitors are scoped by the x-tenant-slug header that nginx sets.
DROP POLICY IF EXISTS anon_tenant_isolation ON public.gw_ticket_tiers;
CREATE POLICY anon_tenant_isolation ON public.gw_ticket_tiers AS RESTRICTIVE
  FOR ALL TO anon
  USING (tenant_id = public.anon_tenant_id())
  WITH CHECK (tenant_id = public.anon_tenant_id());

-- Tenant members can do everything inside their tenant. The RESTRICTIVE
-- isolation above keeps it safe.
DROP POLICY IF EXISTS ticket_tiers_rw     ON public.gw_ticket_tiers;
DROP POLICY IF EXISTS ticket_orders_rw    ON public.gw_ticket_orders;
DROP POLICY IF EXISTS tickets_rw          ON public.gw_tickets;
DROP POLICY IF EXISTS ticket_checkins_rw  ON public.gw_ticket_checkins;
CREATE POLICY ticket_tiers_rw     ON public.gw_ticket_tiers    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY ticket_orders_rw    ON public.gw_ticket_orders   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY tickets_rw          ON public.gw_tickets         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY ticket_checkins_rw  ON public.gw_ticket_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public buy page reads tiers for any event the tenant flagged as
-- is_public. The calendar already has its own public-read policy on
-- gw_events; we don't touch it here.
DROP POLICY IF EXISTS ticket_tiers_public_read ON public.gw_ticket_tiers;
CREATE POLICY ticket_tiers_public_read ON public.gw_ticket_tiers
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.gw_events e
    WHERE e.id = gw_ticket_tiers.event_id
      AND e.is_public = true
  ));

-- ── Billing module registration ────────────────────────────────────────
-- 'addon' tier so the existing admin UI lists it under purchasable add-
-- ons. The stripe_price_id stays NULL until the platform-side pricing
-- is decided; create-module-checkout already refuses to charge with a
-- null price id, so this row can ship dark and be flipped on later.
INSERT INTO public.gw_billing_modules
  (id, name, description, tier, category, icon, is_active, sort_order)
VALUES (
  'box_office',
  'Box Office',
  'Sell tickets to your concerts. QR check-in at the door. Runs on your own Stripe account — GleeWorld takes 0% of ticket revenue.',
  'addon',
  'revenue',
  'Ticket',
  true,
  200
)
ON CONFLICT (id) DO NOTHING;
