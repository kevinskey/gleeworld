-- Souvenirs pull their size and color options from the T-Shirt Brothers catalog.
--
-- TSB stores a garment's real variants on `products` in the `tshirtbrothers`
-- database: `sizes` is a plain string array, `colors` is a richer
-- [{name, hex, swatch, image}] — enough to render actual swatches rather than
-- a text dropdown.
--
-- `gw_merch_products` already mirrors the TSB catalog into GleeWorld but was
-- synced with `variants = {"sizes": [], "colors": []}` for every one of its
-- 5,655 rows, so nothing downstream could offer a choice. The sync script in
-- deploy/concert-rsvp-20260804/ backfills it.
--
-- A souvenir keeps its OWN copy of sizes/colors rather than joining to the
-- catalog at render time, for the same reason merch_items on an order is a
-- snapshot: the blank a garment is printed on can be swapped or discontinued,
-- and what the buyer was offered must not change retroactively.

ALTER TABLE public.gw_event_merch_items
  ADD COLUMN IF NOT EXISTS tb_product_id TEXT,
  ADD COLUMN IF NOT EXISTS colors        JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.gw_event_merch_items.tb_product_id IS
  'TSB products.id this souvenir is printed on. Provenance for re-syncing '
  'sizes/colors; not a live join.';
COMMENT ON COLUMN public.gw_event_merch_items.colors IS
  'Snapshot of [{name, hex, swatch}] offered to buyers. Empty = no color choice.';

-- Republish the public read with colors included. Everything else is
-- unchanged from 20260804190000; see that file for the rationale.
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
               'colors',      m.colors,
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
