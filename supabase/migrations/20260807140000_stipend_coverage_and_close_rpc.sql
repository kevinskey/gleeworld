-- Stipends: surface services where roll was never taken, and make closing atomic.
--
-- Two problems this fixes.
--
-- 1. A service nobody was marked at was invisible.
--
--    Every branch of v_stipend_countable_units required at least one attendance
--    row before the unit existed at all. Skip roll call at a Sunday Mass and
--    that Mass silently left the period: not a zero-credit unit, no unit. Since
--    required_services is a number agreed with the student rather than a count
--    of the calendar, the shortfall came straight out of the student's pocket.
--    A scholar present at all 15 services where roll was taken, against
--    required_services = 20, earned 15/20 of the stipend and forfeited the rest
--    with nothing anywhere reporting why.
--
--    unmarked_count did not catch this. It counts units where *this* student
--    has no row but some other student does, so it is blind to a service where
--    roll was skipped entirely.
--
--    The qualification logic now lives once, in v_stipend_candidate_units, which
--    keeps every unit that matches the period and carries a has_attendance flag.
--    v_stipend_countable_units becomes that view filtered to has_attendance, so
--    its contract and the money are unchanged, and v_stipend_period_coverage
--    reports the gap.
--
-- 2. Closing a period was a client-side loop with no transaction.
--
--    useStipendPeriods.closePeriod read the standing view, then issued one
--    UPDATE per award, then updated the period. A failure partway left some
--    awards frozen and closed while others stayed active and the period stayed
--    open; re-running recomputed from the *current* view, so rows could end up
--    frozen from two different snapshots. It also meant the browser chose the
--    dollar amount written to final_amount.
--
--    close_stipend_period() does the whole close in one statement per table
--    inside one function, from one snapshot, on the server.

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.v_stipend_period_coverage;
DROP VIEW IF EXISTS public.v_stipend_standing;
DROP VIEW IF EXISTS public.v_stipend_countable_units;
DROP VIEW IF EXISTS public.v_stipend_candidate_units;

-- Every unit that belongs to a period, whether or not anyone was marked at it.
CREATE VIEW public.v_stipend_candidate_units AS
-- Attendance-required calendar events.
SELECT
  per.id        AS period_id,
  per.tenant_id AS tenant_id,
  'event'::text AS unit_kind,
  e.id          AS unit_id,
  (e.start_date AT TIME ZONE COALESCE(NULLIF(bs.timezone,''),'UTC'))::date
    AS unit_date,
  NULL::uuid    AS unit_course_id,
  EXISTS (SELECT 1 FROM public.gw_event_attendance a WHERE a.event_id = e.id)
    AS has_attendance
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
       NOT per.event_filter ? 'event_types'
    OR jsonb_array_length(per.event_filter->'event_types') = 0
    OR e.event_type IN (
         SELECT jsonb_array_elements_text(per.event_filter->'event_types'))
     )

UNION ALL

-- Course attendance sessions, for periods that name their courses.
SELECT
  per.id          AS period_id,
  per.tenant_id   AS tenant_id,
  'session'::text AS unit_kind,
  s.id            AS unit_id,
  (s.opens_at AT TIME ZONE COALESCE(NULLIF(bs.timezone,''),'UTC'))::date
    AS unit_date,
  s.course_id     AS unit_course_id,
  EXISTS (SELECT 1 FROM public.gw_attendance_records r
           WHERE r.attendance_session_id = s.id) AS has_attendance
FROM public.gw_stipend_periods per
LEFT JOIN public.gw_branding_settings bs ON bs.tenant_id = per.tenant_id
JOIN public.gw_attendance_sessions s
  ON s.tenant_id = per.tenant_id
 AND s.course_id IS NOT NULL
 AND s.course_id = ANY (per.course_ids)
 AND (s.opens_at AT TIME ZONE COALESCE(NULLIF(bs.timezone,''),'UTC'))::date
       BETWEEN per.starts_on AND per.ends_on
 AND COALESCE(s.status, 'scheduled') <> 'cancelled'

UNION ALL

-- Date-based course attendance. These units are derived from the attendance
-- rows themselves, so they are covered by construction — there is no such
-- thing as an uncovered (course, date) pair.
SELECT DISTINCT
  per.id              AS period_id,
  per.tenant_id       AS tenant_id,
  'course_date'::text AS unit_kind,
  md5(ca.course_id::text || ':' || ca.attendance_date::text)::uuid AS unit_id,
  ca.attendance_date  AS unit_date,
  ca.course_id        AS unit_course_id,
  true                AS has_attendance
FROM public.gw_stipend_periods per
JOIN public.gw_course_attendance ca
  ON ca.tenant_id = per.tenant_id
 AND ca.course_id IS NOT NULL
 AND ca.course_id = ANY (per.course_ids)
 AND ca.attendance_date BETWEEN per.starts_on AND per.ends_on
LEFT JOIN public.gw_branding_settings bs2 ON bs2.tenant_id = per.tenant_id
-- Don't double-count a day that already has a session unit.
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_attendance_sessions s2
   WHERE s2.course_id = ca.course_id
     AND (s2.opens_at AT TIME ZONE COALESCE(NULLIF(bs2.timezone,''),'UTC'))::date
           = ca.attendance_date
     AND COALESCE(s2.status, 'scheduled') <> 'cancelled'
     AND EXISTS (SELECT 1 FROM public.gw_attendance_records r2
                  WHERE r2.attendance_session_id = s2.id));

-- Unchanged contract: the units that actually score.
CREATE VIEW public.v_stipend_countable_units AS
SELECT period_id, tenant_id, unit_kind, unit_id, unit_date, unit_course_id
FROM public.v_stipend_candidate_units
WHERE has_attendance;

CREATE VIEW public.v_stipend_standing AS
WITH profile AS (
  SELECT DISTINCT ON (user_id) user_id, id
  FROM public.gw_profiles
  WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at
), award_units AS (
  SELECT
    aw.id AS award_id, aw.tenant_id, aw.period_id, aw.user_id, aw.base_amount,
    COALESCE(aw.required_services_override, per.required_services)
      AS required_services,
    COALESCE(per.policy_weights, pol.weights,
      '{"late":0.5,"tardy":0.5,"absent":0,"excused":1,"present":1,"in_rehearsal":0.5}'::jsonb)
      AS weights,
    u.unit_id,
    COALESCE(ea.attendance_status, ar.status, ca.status::text) AS attendance_status
  FROM public.gw_stipend_awards aw
  JOIN public.gw_stipend_periods per ON per.id = aw.period_id
  LEFT JOIN public.gw_stipend_policies pol ON pol.id = per.policy_id
  LEFT JOIN profile pr ON pr.user_id = aw.user_id
  LEFT JOIN public.v_stipend_countable_units u
    ON u.period_id = per.id
   AND (aw.enrolled_on IS NULL OR u.unit_date >= aw.enrolled_on)
  LEFT JOIN public.gw_event_attendance ea
    ON u.unit_kind = 'event' AND ea.event_id = u.unit_id AND ea.user_id = aw.user_id
  LEFT JOIN public.gw_attendance_records ar
    ON u.unit_kind = 'session' AND ar.attendance_session_id = u.unit_id
   AND ar.student_profile_id = pr.id
  LEFT JOIN public.gw_course_attendance ca
    ON u.unit_kind = 'course_date' AND ca.course_id = u.unit_course_id
   AND ca.attendance_date = u.unit_date AND ca.student_id = aw.user_id
), scored AS (
  SELECT au.*,
    CASE
      WHEN au.unit_id IS NULL THEN NULL::numeric
      WHEN au.attendance_status IS NULL THEN 0::numeric
      ELSE (au.weights ->> au.attendance_status)::numeric
    END AS weight
  FROM award_units au
)
SELECT
  s.award_id, s.period_id, s.tenant_id, s.user_id, s.base_amount,
  s.required_services,
  ROUND(s.base_amount / NULLIF(s.required_services, 0)::numeric, 2)
    AS per_service_value,
  COALESCE(SUM(s.weight), 0) AS credited_services,
  COUNT(*) FILTER (
    WHERE s.attendance_status IS NOT NULL AND s.weight = 0) AS absences,
  COUNT(*) FILTER (
    WHERE s.unit_id IS NOT NULL AND s.attendance_status IS NULL) AS unmarked_count,
  COUNT(*) FILTER (
    WHERE s.attendance_status IS NOT NULL AND s.weight IS NULL) AS unmapped_count,
  COUNT(s.unit_id) AS countable_events,
  ROUND(LEAST(GREATEST(
    s.base_amount * COALESCE(SUM(s.weight), 0)
      / NULLIF(s.required_services, 0), 0), s.base_amount), 2) AS earned,
  s.base_amount - ROUND(LEAST(GREATEST(
    s.base_amount * COALESCE(SUM(s.weight), 0)
      / NULLIF(s.required_services, 0), 0), s.base_amount), 2) AS forfeited
FROM scored s
GROUP BY s.award_id, s.period_id, s.tenant_id, s.user_id,
         s.base_amount, s.required_services;

-- Period-level answer to "is the attendance data good enough to close?"
CREATE VIEW public.v_stipend_period_coverage AS
SELECT
  per.id                AS period_id,
  per.tenant_id         AS tenant_id,
  per.required_services AS required_services,
  COUNT(u.unit_id)                                          AS candidate_units,
  COUNT(u.unit_id) FILTER (WHERE u.has_attendance)          AS covered_units,
  COUNT(u.unit_id) FILTER (WHERE NOT u.has_attendance)      AS uncovered_units,
  -- How far the countable calendar falls short of what a full stipend needs.
  -- Positive means even perfect attendance cannot earn 100%.
  GREATEST(per.required_services
             - COUNT(u.unit_id) FILTER (WHERE u.has_attendance), 0)
    AS shortfall_units
FROM public.gw_stipend_periods per
LEFT JOIN public.v_stipend_candidate_units u ON u.period_id = per.id
GROUP BY per.id, per.tenant_id, per.required_services;

ALTER VIEW public.v_stipend_candidate_units SET (security_invoker = true);
ALTER VIEW public.v_stipend_countable_units SET (security_invoker = true);
ALTER VIEW public.v_stipend_standing        SET (security_invoker = true);
ALTER VIEW public.v_stipend_period_coverage SET (security_invoker = true);

-- ---------------------------------------------------------------------------
-- Atomic close
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.close_stipend_period(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period    public.gw_stipend_periods%ROWTYPE;
  v_weights   jsonb;
  v_awards    integer := 0;
  v_total     numeric := 0;
  v_uncovered integer := 0;
BEGIN
  -- SECURITY DEFINER bypasses RLS, so both halves of the policy that would
  -- normally guard this table are re-applied by hand.
  IF NOT public.is_current_user_admin_or_super_admin() THEN
    RAISE EXCEPTION 'Not authorized to close stipend periods'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_period
  FROM public.gw_stipend_periods
  WHERE id = p_period_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stipend period % not found', p_period_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_period.tenant_id IS DISTINCT FROM public.current_tenant_id() THEN
    RAISE EXCEPTION 'Stipend period belongs to another tenant'
      USING ERRCODE = '42501';
  END IF;

  IF v_period.status IN ('closed', 'paid') THEN
    RAISE EXCEPTION 'Stipend period is already %', v_period.status
      USING ERRCODE = '55000';
  END IF;

  SELECT COUNT(*) INTO v_uncovered
  FROM public.v_stipend_candidate_units
  WHERE period_id = p_period_id AND NOT has_attendance;

  -- The weights in force at this moment, frozen onto the period so later
  -- policy edits cannot restate a closed period.
  SELECT COALESCE(v_period.policy_weights, pol.weights) INTO v_weights
  FROM public.gw_stipend_policies pol
  WHERE pol.id = v_period.policy_id;
  IF v_weights IS NULL THEN
    v_weights := v_period.policy_weights;
  END IF;

  -- One statement, one snapshot: every award freezes from the same read of
  -- the standing view, which is what the per-row client loop could not promise.
  WITH frozen AS (
    UPDATE public.gw_stipend_awards aw
       SET final_amount = st.earned,
           status       = 'closed',
           updated_at   = now()
      FROM public.v_stipend_standing st
     WHERE st.award_id = aw.id
       AND aw.period_id = p_period_id
    RETURNING aw.final_amount
  )
  SELECT COUNT(*), COALESCE(SUM(final_amount), 0) INTO v_awards, v_total
  FROM frozen;

  UPDATE public.gw_stipend_periods
     SET status        = 'closed',
         closed_at     = now(),
         policy_weights = COALESCE(policy_weights, v_weights),
         updated_at    = now()
   WHERE id = p_period_id;

  RETURN jsonb_build_object(
    'period_id',          p_period_id,
    'awards_closed',      v_awards,
    'total_final_amount', v_total,
    'uncovered_units',    v_uncovered);
END;
$$;

REVOKE ALL ON FUNCTION public.close_stipend_period(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_stipend_period(uuid) TO authenticated;

COMMENT ON FUNCTION public.close_stipend_period(uuid) IS
  'Freezes every award in a stipend period from a single snapshot of '
  'v_stipend_standing and marks the period closed. Admin only; re-checks '
  'tenant and admin because SECURITY DEFINER bypasses RLS.';

COMMENT ON VIEW public.v_stipend_period_coverage IS
  'Per-period attendance coverage. uncovered_units counts services that match '
  'the period but where roll was never taken; those score for nobody and are '
  'invisible to unmarked_count. shortfall_units is how far the covered '
  'calendar falls below required_services.';
