-- Concert RSVP — souvenir merchandise sold alongside box-office tickets.
--
-- The Box Office already models "how many are coming" (gw_ticket_orders.quantity
-- against a gw_ticket_tiers row). What it could not express is "…and I'd like
-- two shirts and a hoodie with that". Rather than stand up a parallel order
-- system, merch rides along on the existing ticket order:
--
--   gw_event_merch_items   — the per-event souvenir catalog (price lives here,
--                            so checkout never trusts a browser-supplied price)
--   gw_ticket_orders.merch_items        — jsonb snapshot of what was bought
--   gw_ticket_orders.merch_amount_cents — merch subtotal, for reporting
--
-- merch_items is a *snapshot*, not a list of foreign keys, on purpose: a
-- shirt's price or name can change after the sale, and the order must keep
-- saying what the buyer actually agreed to pay.
--
-- Fulfillment (gw_box_office_fulfill_order) needs no changes — it mints one
-- ticket per seat and ignores these columns. Merch is handed out at the door.

-- ── Souvenir catalog ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gw_event_merch_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL DEFAULT current_tenant_id(),
  event_id    UUID NOT NULL REFERENCES public.gw_events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency    TEXT NOT NULL DEFAULT 'usd',
  -- Empty array = a one-size item that needs no size picker.
  sizes       JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_event_merch_items_event_idx
  ON public.gw_event_merch_items (event_id, sort_order);

ALTER TABLE public.gw_event_merch_items ENABLE ROW LEVEL SECURITY;

-- Mirrors gw_ticket_tiers exactly: RESTRICTIVE tenant isolation on both roles,
-- PERMISSIVE read for anon but only for events whose box office is published.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='gw_event_merch_items' AND policyname='tenant_isolation_restrict') THEN
    CREATE POLICY tenant_isolation_restrict ON public.gw_event_merch_items
      AS RESTRICTIVE FOR ALL TO authenticated
      USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='gw_event_merch_items' AND policyname='anon_tenant_isolation') THEN
    CREATE POLICY anon_tenant_isolation ON public.gw_event_merch_items
      AS RESTRICTIVE FOR ALL TO anon
      USING (tenant_id = anon_tenant_id())
      WITH CHECK (tenant_id = anon_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='gw_event_merch_items' AND policyname='merch_items_rw') THEN
    CREATE POLICY merch_items_rw ON public.gw_event_merch_items
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='gw_event_merch_items' AND policyname='merch_items_public_read') THEN
    CREATE POLICY merch_items_public_read ON public.gw_event_merch_items
      FOR SELECT TO anon
      USING (EXISTS (
        SELECT 1 FROM public.gw_events e
         WHERE e.id = gw_event_merch_items.event_id
           AND e.box_office_status = 'published'
      ));
  END IF;
END $$;

-- ── Merch on the order ─────────────────────────────────────────────────────

ALTER TABLE public.gw_ticket_orders
  ADD COLUMN IF NOT EXISTS merch_items        JSONB   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS merch_amount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buyer_phone        TEXT,
  ADD COLUMN IF NOT EXISTS notes              TEXT;

-- ── Public read for the RSVP form ──────────────────────────────────────────
--
-- The form runs anonymously on the tenant's public site and needs the event,
-- its tiers, and its merch in one round trip. The anon policies above would
-- allow those three reads separately; this keeps the block to a single call
-- and lets it resolve the tenant by slug without exposing gw_tenants to anon.
--
-- SECURITY DEFINER + a hard box_office_status='published' filter: this can
-- only ever return an event the tenant has deliberately put on sale.

CREATE OR REPLACE FUNCTION public.gw_concert_rsvp_public_event(
  p_tenant_slug TEXT,
  p_event_slug  TEXT
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_event     RECORD;
BEGIN
  SELECT id INTO v_tenant_id
    FROM gw_tenants
   WHERE slug = lower(trim(p_tenant_slug));
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'tenant_not_found');
  END IF;

  SELECT * INTO v_event
    FROM gw_events
   WHERE tenant_id = v_tenant_id
     AND box_office_slug = p_event_slug
     AND box_office_status = 'published';
  IF v_event IS NULL THEN
    RETURN jsonb_build_object('error', 'event_not_found');
  END IF;

  RETURN jsonb_build_object(
    'event', jsonb_build_object(
      'id',          v_event.id,
      'title',       v_event.title,
      'description', v_event.description,
      'start_date',  v_event.start_date,
      'end_date',    v_event.end_date,
      'venue_name',  v_event.venue_name,
      'address',     v_event.address,
      'image_url',   v_event.image_url,
      'slug',        v_event.box_office_slug
    ),
    'tiers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id',          t.id,
               'name',        t.name,
               'description', t.description,
               'price_cents', t.price_cents,
               'currency',    t.currency,
               -- Never expose raw capacity; the form only needs "how many can
               -- I still put in the box".
               'remaining',   GREATEST(0, t.quantity_total - t.quantity_sold)
             ) ORDER BY t.sort_order, t.price_cents)
        FROM gw_ticket_tiers t
       WHERE t.event_id = v_event.id
    ), '[]'::jsonb),
    'merch', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id',          m.id,
               'name',        m.name,
               'description', m.description,
               'price_cents', m.price_cents,
               'currency',    m.currency,
               'sizes',       m.sizes,
               'image_url',   m.image_url
             ) ORDER BY m.sort_order, m.name)
        FROM gw_event_merch_items m
       WHERE m.event_id = v_event.id
         AND m.is_active
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.gw_concert_rsvp_public_event(TEXT, TEXT)
  TO anon, authenticated, service_role;
