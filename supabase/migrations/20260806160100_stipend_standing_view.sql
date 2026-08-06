-- Live stipend standing. Derived on read so it can never drift out of sync
-- with attendance. Mirrors src/features/stipends/calculate.ts exactly.

CREATE OR REPLACE VIEW public.v_stipend_countable_events AS
SELECT
  per.id         AS period_id,
  per.tenant_id  AS tenant_id,
  e.id           AS event_id,
  e.start_date::date AS event_date
FROM public.gw_stipend_periods per
JOIN public.gw_events e
  ON e.tenant_id = per.tenant_id
 AND e.start_date::date BETWEEN per.starts_on AND per.ends_on
 -- Only events the tenant actually takes attendance for.
 AND COALESCE(e.attendance_required, false) = true
 -- A cancelled service is nobody's absence.
 AND COALESCE(e.status, 'scheduled') <> 'cancelled'
 AND (
   NOT (per.event_filter ? 'event_types')
   OR jsonb_array_length(per.event_filter -> 'event_types') = 0
   OR e.event_type IN (
        SELECT jsonb_array_elements_text(per.event_filter -> 'event_types'))
 )
-- The rule that matters most: if roll was never taken, the event does not
-- count at all. Nobody is marked absent for a service the tenant forgot to
-- record.
WHERE EXISTS (
  SELECT 1 FROM public.gw_event_attendance a WHERE a.event_id = e.id
);

CREATE OR REPLACE VIEW public.v_stipend_standing AS
WITH award_events AS (
  SELECT
    aw.id AS award_id,
    aw.tenant_id,
    aw.period_id,
    aw.user_id,
    aw.base_amount,
    COALESCE(aw.required_services_override, per.required_services)
      AS required_services,
    COALESCE(per.policy_weights, pol.weights,
             '{"present":1,"late":0.5,"tardy":0.5,"excused":1,"absent":0}'::jsonb)
      AS weights,
    COALESCE(pol.rounding, 'cent') AS rounding,
    ce.event_id,
    att.attendance_status
  FROM public.gw_stipend_awards aw
  JOIN public.gw_stipend_periods per ON per.id = aw.period_id
  LEFT JOIN public.gw_stipend_policies pol ON pol.id = per.policy_id
  LEFT JOIN public.v_stipend_countable_events ce
    ON ce.period_id = per.id
   -- Mid-period joiners are only measured from their enrollment date.
   AND (aw.enrolled_on IS NULL OR ce.event_date >= aw.enrolled_on)
  LEFT JOIN public.gw_event_attendance att
    ON att.event_id = ce.event_id AND att.user_id = aw.user_id
),
scored AS (
  SELECT
    ae.*,
    CASE
      WHEN ae.event_id IS NULL THEN NULL
      -- Roll was taken but this student has no row: treated as an absence,
      -- and surfaced separately as unmarked so an admin can audit it.
      WHEN ae.attendance_status IS NULL THEN 0::numeric
      ELSE (ae.weights ->> ae.attendance_status)::numeric
    END AS weight
  FROM award_events ae
)
SELECT
  s.award_id,
  s.period_id,
  s.tenant_id,
  s.user_id,
  s.base_amount,
  s.required_services,
  ROUND(s.base_amount / NULLIF(s.required_services, 0), 2) AS per_service_value,
  COALESCE(SUM(s.weight), 0) AS credited_services,
  COUNT(*) FILTER (
    WHERE s.attendance_status IS NOT NULL AND s.weight = 0) AS absences,
  COUNT(*) FILTER (
    WHERE s.event_id IS NOT NULL AND s.attendance_status IS NULL) AS unmarked_count,
  COUNT(*) FILTER (
    WHERE s.attendance_status IS NOT NULL AND s.weight IS NULL) AS unmapped_count,
  COUNT(s.event_id) AS countable_events,
  ROUND(
    LEAST(
      GREATEST(
        s.base_amount * COALESCE(SUM(s.weight), 0)
          / NULLIF(s.required_services, 0), 0),
      s.base_amount), 2) AS earned,
  s.base_amount - ROUND(
    LEAST(
      GREATEST(
        s.base_amount * COALESCE(SUM(s.weight), 0)
          / NULLIF(s.required_services, 0), 0),
      s.base_amount), 2) AS forfeited
FROM scored s
GROUP BY s.award_id, s.period_id, s.tenant_id, s.user_id,
         s.base_amount, s.required_services;

-- Views run with the definer's rights by default; force them to respect the
-- querying user's RLS on the underlying tables.
ALTER VIEW public.v_stipend_countable_events SET (security_invoker = true);
ALTER VIEW public.v_stipend_standing SET (security_invoker = true);
