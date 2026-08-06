-- Count the third attendance store: gw_course_attendance.
--
-- There are three ways to record course attendance and, until now, only two
-- of them earned stipend credit:
--
--   CourseAttendanceGrid / AttendanceConsole -> gw_attendance_records   counted
--   QRAttendanceAddon / AttendanceModule     -> gw_course_attendance    IGNORED
--
-- Attendance taken through the QR addon or the dashboard attendance module
-- looked recorded and earned nothing. gw_course_attendance was empty in every
-- tenant when this shipped, so this is preventive rather than a repair.
--
-- Shape differences that make this easy: student_id is the auth user_id (no
-- gw_profiles hop), and attendance_date is a plain DATE (no timezone cast).
--
-- The unit here is a (course, date) pair rather than a row, since this table
-- stores one row per student per day.

DROP VIEW IF EXISTS public.v_stipend_standing;
DROP VIEW IF EXISTS public.v_stipend_countable_units;

CREATE VIEW public.v_stipend_countable_units AS
-- Attendance-required calendar events.
SELECT
  per.id        AS period_id,
  per.tenant_id AS tenant_id,
  'event'::text AS unit_kind,
  e.id          AS unit_id,
  (e.start_date AT TIME ZONE COALESCE(NULLIF(bs.timezone,''),'UTC'))::date
    AS unit_date,
  NULL::uuid    AS unit_course_id
FROM public.gw_stipend_periods per
-- LEFT so a tenant with no branding row falls back to UTC rather than
-- dropping every unit for that tenant.
LEFT JOIN public.gw_branding_settings bs ON bs.tenant_id = per.tenant_id
JOIN public.gw_events e
  ON e.tenant_id = per.tenant_id
 AND (e.start_date AT TIME ZONE COALESCE(NULLIF(bs.timezone,''),'UTC'))::date
       BETWEEN per.starts_on AND per.ends_on
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

-- Class meetings recorded as attendance sessions (Roll Call, course QR grid).
SELECT
  per.id          AS period_id,
  per.tenant_id   AS tenant_id,
  'session'::text AS unit_kind,
  s.id            AS unit_id,
  (s.opens_at AT TIME ZONE COALESCE(NULLIF(bs.timezone,''),'UTC'))::date
    AS unit_date,
  s.course_id     AS unit_course_id
FROM public.gw_stipend_periods per
LEFT JOIN public.gw_branding_settings bs ON bs.tenant_id = per.tenant_id
JOIN public.gw_attendance_sessions s
  ON s.tenant_id = per.tenant_id
 AND s.course_id IS NOT NULL
 AND s.course_id = ANY (per.course_ids)
 AND (s.opens_at AT TIME ZONE COALESCE(NULLIF(bs.timezone,''),'UTC'))::date
       BETWEEN per.starts_on AND per.ends_on
 AND COALESCE(s.status, 'scheduled') <> 'cancelled'
WHERE EXISTS (
  SELECT 1 FROM public.gw_attendance_records r
  WHERE r.attendance_session_id = s.id
)

UNION ALL

-- Date-based course attendance (QR addon, dashboard attendance module).
-- One unit per (course, date); the table holds a row per student per day.
SELECT DISTINCT
  per.id              AS period_id,
  per.tenant_id       AS tenant_id,
  'course_date'::text AS unit_kind,
  md5(ca.course_id::text || ':' || ca.attendance_date::text)::uuid AS unit_id,
  ca.attendance_date  AS unit_date,
  ca.course_id        AS unit_course_id
FROM public.gw_stipend_periods per
JOIN public.gw_course_attendance ca
  ON ca.tenant_id = per.tenant_id
 AND ca.course_id IS NOT NULL
 AND ca.course_id = ANY (per.course_ids)
 AND ca.attendance_date BETWEEN per.starts_on AND per.ends_on
LEFT JOIN public.gw_branding_settings bs2 ON bs2.tenant_id = per.tenant_id
-- If the same course+day was also rolled through an attendance session, that
-- session already supplies the unit. Counting both would double the day.
WHERE NOT EXISTS (
  SELECT 1
  FROM public.gw_attendance_sessions s2
  WHERE s2.course_id = ca.course_id
    AND (s2.opens_at AT TIME ZONE COALESCE(NULLIF(bs2.timezone,''),'UTC'))::date
          = ca.attendance_date
    AND COALESCE(s2.status,'scheduled') <> 'cancelled'
    AND EXISTS (SELECT 1 FROM public.gw_attendance_records r2
                WHERE r2.attendance_session_id = s2.id)
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
    COALESCE(ea.attendance_status, ar.status, ca.status) AS attendance_status
  FROM public.gw_stipend_awards aw
  JOIN public.gw_stipend_periods per ON per.id = aw.period_id
  LEFT JOIN public.gw_stipend_policies pol ON pol.id = per.policy_id
  LEFT JOIN profile pr ON pr.user_id = aw.user_id
  LEFT JOIN public.v_stipend_countable_units u
    ON u.period_id = per.id
   AND (aw.enrolled_on IS NULL OR u.unit_date >= aw.enrolled_on)
  LEFT JOIN public.gw_event_attendance ea
    ON u.unit_kind = 'event'
   AND ea.event_id = u.unit_id
   AND ea.user_id = aw.user_id
  LEFT JOIN public.gw_attendance_records ar
    ON u.unit_kind = 'session'
   AND ar.attendance_session_id = u.unit_id
   AND ar.student_profile_id = pr.id
  -- student_id here is the auth user_id, so it matches the award directly.
  LEFT JOIN public.gw_course_attendance ca
    ON u.unit_kind = 'course_date'
   AND ca.course_id = u.unit_course_id
   AND ca.attendance_date = u.unit_date
   AND ca.student_id = aw.user_id
),
scored AS (
  SELECT
    au.*,
    CASE
      WHEN au.unit_id IS NULL THEN NULL
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
