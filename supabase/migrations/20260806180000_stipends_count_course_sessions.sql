-- Stipends count course class attendance, not just calendar events.
--
-- Attendance for the scholar programs (Bowman MUS-240, Newman MUS-495) is
-- taken in the courses, which writes gw_attendance_records via
-- gw_attendance_sessions — a completely separate store from the
-- gw_event_attendance rows the first cut read. Sessions and events are now
-- unified into one "countable unit" so a service is any class meeting OR
-- attendance-required event where roll was actually taken.

-- 1. Which courses a period counts. Empty array = no course sessions count,
--    so this stays opt-in and existing periods are unaffected.
ALTER TABLE public.gw_stipend_periods
  ADD COLUMN IF NOT EXISTS course_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

-- 2. QR check-in writes 'in_rehearsal' and only a second checkout scan
--    upgrades it to 'present'. Unmapped it would score zero, so a student who
--    showed up and checked in would lose a service to a missing scan.
--    Half credit, matching 'late'.
ALTER TABLE public.gw_stipend_policies
  ALTER COLUMN weights SET DEFAULT
    '{"present":1,"late":0.5,"tardy":0.5,"excused":1,"absent":0,"in_rehearsal":0.5}'::jsonb;

UPDATE public.gw_stipend_policies
   SET weights = weights || '{"in_rehearsal":0.5}'::jsonb
 WHERE NOT (weights ? 'in_rehearsal');

-- 3. Rebuild the views. Column lists change, so these must be dropped rather
--    than CREATE OR REPLACE'd. Standing depends on the units view, so it goes
--    first.
DROP VIEW IF EXISTS public.v_stipend_standing;
DROP VIEW IF EXISTS public.v_stipend_countable_events;
DROP VIEW IF EXISTS public.v_stipend_countable_units;

CREATE VIEW public.v_stipend_countable_units AS
-- Attendance-required calendar events.
SELECT
  per.id            AS period_id,
  per.tenant_id     AS tenant_id,
  'event'::text     AS unit_kind,
  e.id              AS unit_id,
  e.start_date::date AS unit_date
FROM public.gw_stipend_periods per
JOIN public.gw_events e
  ON e.tenant_id = per.tenant_id
 AND e.start_date::date BETWEEN per.starts_on AND per.ends_on
 AND COALESCE(e.attendance_required, false) = true
 AND COALESCE(e.status, 'scheduled') <> 'cancelled'
 AND (
   NOT (per.event_filter ? 'event_types')
   OR jsonb_array_length(per.event_filter -> 'event_types') = 0
   OR e.event_type IN (
        SELECT jsonb_array_elements_text(per.event_filter -> 'event_types'))
 )
-- Roll must actually have been taken, or the event counts for nobody.
WHERE EXISTS (
  SELECT 1 FROM public.gw_event_attendance a WHERE a.event_id = e.id
)

UNION ALL

-- Class meetings in the courses this period counts.
SELECT
  per.id           AS period_id,
  per.tenant_id    AS tenant_id,
  'session'::text  AS unit_kind,
  s.id             AS unit_id,
  s.opens_at::date AS unit_date
FROM public.gw_stipend_periods per
JOIN public.gw_attendance_sessions s
  ON s.tenant_id = per.tenant_id
 AND s.course_id IS NOT NULL
 AND s.course_id = ANY (per.course_ids)
 AND s.opens_at::date BETWEEN per.starts_on AND per.ends_on
 AND COALESCE(s.status, 'scheduled') <> 'cancelled'
WHERE EXISTS (
  SELECT 1 FROM public.gw_attendance_records r
  WHERE r.attendance_session_id = s.id
);

CREATE VIEW public.v_stipend_standing AS
WITH profile AS (
  -- gw_attendance_records keys on gw_profiles.id, awards key on user_id.
  -- DISTINCT ON guarantees one profile per user so the join cannot fan out.
  SELECT DISTINCT ON (user_id) user_id, id
  FROM public.gw_profiles
  WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at NULLS LAST
),
award_units AS (
  SELECT
    aw.id AS award_id,
    aw.tenant_id,
    aw.period_id,
    aw.user_id,
    aw.base_amount,
    COALESCE(aw.required_services_override, per.required_services)
      AS required_services,
    COALESCE(per.policy_weights, pol.weights,
             '{"present":1,"late":0.5,"tardy":0.5,"excused":1,"absent":0,"in_rehearsal":0.5}'::jsonb)
      AS weights,
    u.unit_id,
    COALESCE(ea.attendance_status, ar.status) AS attendance_status
  FROM public.gw_stipend_awards aw
  JOIN public.gw_stipend_periods per ON per.id = aw.period_id
  LEFT JOIN public.gw_stipend_policies pol ON pol.id = per.policy_id
  LEFT JOIN profile pr ON pr.user_id = aw.user_id
  LEFT JOIN public.v_stipend_countable_units u
    ON u.period_id = per.id
   -- Mid-period joiners are only measured from their enrollment date.
   AND (aw.enrolled_on IS NULL OR u.unit_date >= aw.enrolled_on)
  LEFT JOIN public.gw_event_attendance ea
    ON u.unit_kind = 'event'
   AND ea.event_id = u.unit_id
   AND ea.user_id = aw.user_id
  LEFT JOIN public.gw_attendance_records ar
    ON u.unit_kind = 'session'
   AND ar.attendance_session_id = u.unit_id
   AND ar.student_profile_id = pr.id
),
scored AS (
  SELECT
    au.*,
    CASE
      WHEN au.unit_id IS NULL THEN NULL
      -- Roll was taken but this student has no row: an absence, surfaced
      -- separately as unmarked so an admin can audit it before closing.
      WHEN au.attendance_status IS NULL THEN 0::numeric
      ELSE (au.weights ->> au.attendance_status)::numeric
    END AS weight
  FROM award_units au
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
    WHERE s.unit_id IS NOT NULL AND s.attendance_status IS NULL) AS unmarked_count,
  COUNT(*) FILTER (
    WHERE s.attendance_status IS NOT NULL AND s.weight IS NULL) AS unmapped_count,
  COUNT(s.unit_id) AS countable_events,
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

ALTER VIEW public.v_stipend_countable_units SET (security_invoker = true);
ALTER VIEW public.v_stipend_standing SET (security_invoker = true);
