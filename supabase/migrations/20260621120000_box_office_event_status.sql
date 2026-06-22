-- Box Office Phase C — surface ticketing on top of the existing calendar.
--
-- A "ticketable event" is just a row in gw_events with box_office_status
-- set. NULL means it's a normal calendar event (rehearsal, run-out, etc.)
-- with no ticketing surface. 'draft' lets the tenant build out tiers in
-- private; 'published' makes the public buy page live; 'closed' takes
-- the page offline after the show.
--
-- box_office_slug is the URL fragment for the public buy page —
-- demo.gleeworld.org/concert-tickets/<slug>. UNIQUE per tenant so two
-- tenants can each have a "/spring-concert" without clashing.

ALTER TABLE public.gw_events
  ADD COLUMN IF NOT EXISTS box_office_status TEXT
    CHECK (box_office_status IN ('draft', 'published', 'closed')),
  ADD COLUMN IF NOT EXISTS box_office_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS gw_events_box_office_slug_per_tenant
  ON public.gw_events (tenant_id, box_office_slug)
  WHERE box_office_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS gw_events_box_office_published_idx
  ON public.gw_events (tenant_id, box_office_status, start_date)
  WHERE box_office_status = 'published';

-- Tighten the public-read policy on ticket tiers: only return tiers
-- belonging to events the tenant explicitly published for ticketing.
-- The earlier policy filtered on is_public, which was too loose — any
-- calendar event marked public would have leaked its (empty) tier list.
DROP POLICY IF EXISTS ticket_tiers_public_read ON public.gw_ticket_tiers;
CREATE POLICY ticket_tiers_public_read ON public.gw_ticket_tiers
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.gw_events e
    WHERE e.id = gw_ticket_tiers.event_id
      AND e.box_office_status = 'published'
  ));

-- Same idea on events — anon should only see PUBLISHED box-office events
-- on the buy page, not draft / closed ones. The existing anon read policies
-- on gw_events (calendar visibility) stay untouched; we add a SECOND
-- PERMISSIVE policy that allows the box-office subset through.
DROP POLICY IF EXISTS events_box_office_public_read ON public.gw_events;
CREATE POLICY events_box_office_public_read ON public.gw_events
  FOR SELECT TO anon
  USING (box_office_status = 'published');
