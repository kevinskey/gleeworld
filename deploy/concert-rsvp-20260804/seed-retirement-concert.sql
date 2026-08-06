-- Seed: Kevin's Retirement Concert (tenant `kevin`).
-- Idempotent — keyed on (tenant_id, box_office_slug) / (event_id, name).

DO $$
DECLARE
  v_tenant   UUID := '364cc4db-68d6-4b7e-bed1-94166a1f2deb';  -- kevin
  v_calendar UUID := '8afeb872-6125-492a-a090-ed7f01e5ea15';  -- "My Events"
  -- gw_events has a legacy mirror trigger (sync_gw_event_to_events) that copies
  -- the row into `events`, where created_by is NOT NULL. Kevin Johnson's uid.
  v_owner    UUID := 'f7b60271-d4dc-4133-8b1a-78f87a60d5d3';
  v_event    UUID;
BEGIN
  SELECT id INTO v_event
    FROM gw_events
   WHERE tenant_id = v_tenant AND box_office_slug = 'retirement-concert';

  IF v_event IS NULL THEN
    INSERT INTO gw_events (
      tenant_id, calendar_id, title, description, event_type, status,
      start_date, end_date, venue_name, address,
      is_public, registration_required, max_attendees,
      box_office_status, box_office_slug, created_by
    ) VALUES (
      v_tenant, v_calendar,
      'Kevin Phillip Johnson — Retirement Concert',
      'A celebration of a life in music. Join us for an evening of song honoring '
      || 'Kevin Phillip Johnson''s retirement, with friends, family, colleagues and '
      || 'singers from across the years.',
      'performance', 'scheduled',
      TIMESTAMPTZ '2026-10-18 18:00:00-04',
      TIMESTAMPTZ '2026-10-18 20:30:00-04',
      'Lyke House — Catholic Center at the AUC',
      '809 Beckwith Street SW, Atlanta, GA 30314',
      true, true, 300,
      'published', 'retirement-concert', v_owner
    )
    RETURNING id INTO v_event;
    RAISE NOTICE 'created event %', v_event;
  ELSE
    RAISE NOTICE 'event already exists %', v_event;
  END IF;

  -- Ticket tier — "how many are coming" counts against this.
  IF NOT EXISTS (SELECT 1 FROM gw_ticket_tiers WHERE event_id = v_event AND name = 'Concert Ticket') THEN
    INSERT INTO gw_ticket_tiers (tenant_id, event_id, name, description, price_cents, quantity_total, sort_order)
    VALUES (v_tenant, v_event, 'Concert Ticket', 'General admission — Sunday, October 18 at 6:00 PM', 5000, 300, 0);
  END IF;

  -- Souvenirs.
  IF NOT EXISTS (SELECT 1 FROM gw_event_merch_items WHERE event_id = v_event AND name = 'Souvenir T-Shirt') THEN
    INSERT INTO gw_event_merch_items (tenant_id, event_id, name, description, price_cents, sizes, sort_order)
    VALUES (v_tenant, v_event, 'Souvenir T-Shirt', 'Commemorative concert tee', 3000,
            '["S","M","L","XL","2XL","3XL"]'::jsonb, 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM gw_event_merch_items WHERE event_id = v_event AND name = 'Souvenir Hoodie') THEN
    INSERT INTO gw_event_merch_items (tenant_id, event_id, name, description, price_cents, sizes, sort_order)
    VALUES (v_tenant, v_event, 'Souvenir Hoodie', 'Heavyweight commemorative hoodie', 6000,
            '["S","M","L","XL","2XL","3XL"]'::jsonb, 1);
  END IF;
END $$;

SELECT e.id AS event_id, e.title, e.start_date, e.box_office_slug, e.box_office_status
  FROM gw_events e
 WHERE e.tenant_id = '364cc4db-68d6-4b7e-bed1-94166a1f2deb'
   AND e.box_office_slug = 'retirement-concert';
