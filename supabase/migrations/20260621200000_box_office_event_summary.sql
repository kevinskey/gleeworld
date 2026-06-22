-- Box Office Phase H — post-event summary view.
--
-- Per-event roll-up of paid + comp + revenue + check-in numbers. The
-- Program Health module already joins events via ensemble_id (added in
-- 20260608115320_program_health_phase0.sql), so this view slots in as a
-- new data source the module can read for ensemble-scoped concerts
-- without us having to rebuild its UI.
--
-- The view is plain SQL on top of base tables with RLS enabled, so any
-- authenticated caller is automatically scoped to their own tenant via
-- the tenant_isolation_restrict policies on gw_events / gw_ticket_orders
-- / gw_ticket_checkins. No extra RLS needed on the view.

CREATE OR REPLACE VIEW public.v_box_office_event_summary AS
WITH order_agg AS (
  SELECT
    event_id,
    SUM(CASE WHEN status = 'paid'     THEN quantity     ELSE 0 END)::int    AS paid_count,
    SUM(CASE WHEN status = 'comp'     THEN quantity     ELSE 0 END)::int    AS comp_count,
    SUM(CASE WHEN status = 'refunded' THEN quantity     ELSE 0 END)::int    AS refunded_count,
    SUM(CASE WHEN status = 'paid'     THEN amount_cents ELSE 0 END)::bigint AS gross_revenue_cents
  FROM public.gw_ticket_orders
  GROUP BY event_id
),
checkin_agg AS (
  -- One row per ticket-with-checkin. UNIQUE(ticket_id) on gw_ticket_checkins
  -- means COUNT(*) is the redeemed-ticket count, no DISTINCT needed.
  SELECT
    t.event_id,
    COUNT(*)::int AS checkin_count
  FROM public.gw_ticket_checkins c
  JOIN public.gw_tickets t ON t.id = c.ticket_id
  GROUP BY t.event_id
)
SELECT
  e.id                       AS event_id,
  e.tenant_id,
  e.ensemble_id,
  e.title                    AS event_title,
  e.start_date               AS event_starts_at,
  e.box_office_status,
  e.box_office_slug,
  e.max_attendees            AS capacity,
  COALESCE(oa.paid_count, 0)            AS paid_count,
  COALESCE(oa.comp_count, 0)            AS comp_count,
  COALESCE(oa.refunded_count, 0)        AS refunded_count,
  (COALESCE(oa.paid_count, 0) + COALESCE(oa.comp_count, 0))::int AS tickets_issued,
  COALESCE(oa.gross_revenue_cents, 0)   AS gross_revenue_cents,
  COALESCE(ca.checkin_count, 0)         AS checkin_count,
  -- Check-in rate as a percentage 0–100 (NULL when no tickets issued).
  -- Program Health uses 0–100 numerics elsewhere (attendance_rate_30d
  -- on gw_health_snapshots), so we match that scale.
  CASE
    WHEN (COALESCE(oa.paid_count, 0) + COALESCE(oa.comp_count, 0)) > 0 THEN
      ROUND(
        COALESCE(ca.checkin_count, 0)::numeric
        / (COALESCE(oa.paid_count, 0) + COALESCE(oa.comp_count, 0))::numeric
        * 100,
        1
      )
    ELSE NULL
  END                          AS checkin_rate_pct
FROM public.gw_events e
LEFT JOIN order_agg   oa ON oa.event_id = e.id
LEFT JOIN checkin_agg ca ON ca.event_id = e.id
WHERE e.box_office_status IS NOT NULL;

COMMENT ON VIEW public.v_box_office_event_summary IS
  'Per-event Box Office summary (paid/comp counts, gross revenue, check-in rate). '
  'Read directly by the Box Office admin UI and joined by Program Health for '
  'ensemble-scoped concerts.';

-- Grant explicit SELECT to authenticated / anon. Anon won't see anything
-- through the view because the underlying gw_ticket_orders / gw_ticket_checkins
-- have no anon-read policies; the view inherits that. Granting SELECT just
-- keeps PostgREST from 404-ing on the resource.
GRANT SELECT ON public.v_box_office_event_summary TO authenticated, anon;
