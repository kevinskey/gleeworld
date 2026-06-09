-- Program Health module — Phase 2 (compute layer)
--
-- Adds the per-ensemble link on attendance sessions, the PL/pgSQL functions
-- that compute a stability score from live data, and the pg_cron nightly job
-- that calls them. All additive. Re-running this file is safe.
--
-- Score weights are stamped as constants here and the version written to
-- gw_health_snapshots.weights_version, so tuning later doesn't invalidate
-- historical snapshots.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Extensions
-- pg_net is already installed; pg_cron we need for the nightly schedule.
-- ─────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Attendance ↔ ensemble link
-- gw_attendance_sessions.event_id points to the unprefixed `events` table,
-- which has no ensemble concept. Add an optional ensemble_id so sessions can
-- be scoped directly to a Program Health ensemble.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.gw_attendance_sessions
  ADD COLUMN IF NOT EXISTS ensemble_id uuid REFERENCES public.gw_ensembles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_gw_attendance_sessions_ensemble
  ON public.gw_attendance_sessions(ensemble_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. compute_health_snapshot(p_ensemble_id)
-- Reads the live tables, computes 5 metrics, builds flags + score, writes
-- one row to gw_health_snapshots, returns the snapshot id. Runs SECURITY
-- DEFINER so cron / service-role callers can write past the admin-only
-- RLS policy on gw_health_snapshots.
--
-- Returns NULL if the ensemble has no members (nothing to score yet).
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_health_snapshot(p_ensemble_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Score weights (v1) — tune by editing these and bumping WEIGHTS_VERSION.
  WEIGHTS_VERSION constant text := 'v1';
  ATTENDANCE_TARGET constant numeric := 95.0;     -- expected attendance %
  ATTENDANCE_SLOPE  constant numeric := 0.4;
  ATTENDANCE_CAP    constant numeric := 20.0;
  RETENTION_TARGET  constant numeric := 95.0;
  RETENTION_SLOPE   constant numeric := 0.4;
  RETENTION_CAP     constant numeric := 15.0;
  DELTA_MILD        constant numeric := -5.0;
  DELTA_MILD_PEN    constant numeric := 10.0;
  DELTA_BAD         constant numeric := -10.0;
  DELTA_BAD_PEN     constant numeric := 20.0;
  THIN_SEV_MILD     constant numeric := 0.25;
  THIN_PEN_MILD     constant numeric := 3.0;
  THIN_SEV_BAD      constant numeric := 0.5;
  THIN_PEN_BAD      constant numeric := 7.0;
  READINESS_PEN     constant numeric := 15.0;
  READINESS_WINDOW  constant int     := 21;       -- days
  READINESS_THRESH  constant numeric := 80.0;     -- attendance rate %

  v_member_count       int;
  v_rate_30d           numeric;
  v_rate_prev          numeric;
  v_delta              numeric;
  v_retention          numeric;
  v_thin_sections      jsonb;
  v_readiness_gap_days int;
  v_score              numeric := 100.0;
  v_penalty            numeric;
  v_flags              jsonb := '[]'::jsonb;
  v_snapshot_id        uuid;
BEGIN
  -- Bail early if the ensemble doesn't exist or has no members yet.
  SELECT COUNT(*) INTO v_member_count
    FROM public.gw_ensemble_members
   WHERE ensemble_id = p_ensemble_id;

  IF v_member_count = 0 THEN
    RETURN NULL;
  END IF;

  -- ── Attendance rate, last 30 days ──
  -- Numerator: records with status 'present' or 'late' (we treat 'late' as the
  -- spec's 'tardy' — they showed up). Denominator: all non-'excused' records
  -- (excused doesn't help or hurt). Sessions scoped to this ensemble.
  SELECT
    CASE WHEN COUNT(*) FILTER (WHERE r.status <> 'excused') = 0 THEN NULL
    ELSE ROUND(
      100.0 * COUNT(*) FILTER (WHERE r.status IN ('present','late'))
            / COUNT(*) FILTER (WHERE r.status <> 'excused'),
      2)
    END
  INTO v_rate_30d
  FROM public.gw_attendance_records r
  JOIN public.gw_attendance_sessions s ON s.id = r.attendance_session_id
  WHERE s.ensemble_id = p_ensemble_id
    AND s.opens_at >= now() - interval '30 days';

  -- Prior 30 days for delta.
  SELECT
    CASE WHEN COUNT(*) FILTER (WHERE r.status <> 'excused') = 0 THEN NULL
    ELSE ROUND(
      100.0 * COUNT(*) FILTER (WHERE r.status IN ('present','late'))
            / COUNT(*) FILTER (WHERE r.status <> 'excused'),
      2)
    END
  INTO v_rate_prev
  FROM public.gw_attendance_records r
  JOIN public.gw_attendance_sessions s ON s.id = r.attendance_session_id
  WHERE s.ensemble_id = p_ensemble_id
    AND s.opens_at >= now() - interval '60 days'
    AND s.opens_at <  now() - interval '30 days';

  IF v_rate_30d IS NOT NULL AND v_rate_prev IS NOT NULL THEN
    v_delta := v_rate_30d - v_rate_prev;
  END IF;

  -- ── Retention rate, rolling 90 days ──
  -- active / (active + dropped over the window)
  SELECT ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'active')
          / NULLIF(COUNT(*) FILTER (WHERE status IN ('active','dropped')
                                     AND (left_on IS NULL OR left_on >= now() - interval '90 days')), 0),
    2)
  INTO v_retention
  FROM public.gw_ensemble_members
  WHERE ensemble_id = p_ensemble_id;

  -- ── Thin sections ──
  -- For each section target, count current active members in that voice_part.
  -- Severity = (target - current) / target, only when current < target.
  WITH section_counts AS (
    SELECT
      t.voice_part,
      t.target_count,
      COUNT(p.id) FILTER (WHERE p.voice_part = t.voice_part) AS current_count
    FROM public.gw_section_targets t
    LEFT JOIN public.gw_ensemble_members em
      ON em.ensemble_id = t.ensemble_id AND em.status = 'active'
    LEFT JOIN public.gw_profiles p ON p.id = em.profile_id
    WHERE t.ensemble_id = p_ensemble_id
    GROUP BY t.voice_part, t.target_count
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'voice_part', voice_part,
        'current',    current_count,
        'target',     target_count,
        'severity',   ROUND((target_count - current_count)::numeric / target_count, 3)
      )
      ORDER BY (target_count - current_count)::numeric / target_count DESC
    ) FILTER (WHERE current_count < target_count), '[]'::jsonb)
  INTO v_thin_sections
  FROM section_counts;

  -- ── Readiness gap ──
  -- Next performance within READINESS_WINDOW days; flag only if attendance
  -- rate is below READINESS_THRESH.
  IF v_rate_30d IS NOT NULL AND v_rate_30d < READINESS_THRESH THEN
    SELECT (EXTRACT(EPOCH FROM (start_date - now())) / 86400)::int
      INTO v_readiness_gap_days
      FROM public.gw_events
     WHERE ensemble_id = p_ensemble_id
       AND attendance_type = 'required'
       AND start_date BETWEEN now() AND now() + (READINESS_WINDOW || ' days')::interval
     ORDER BY start_date ASC
     LIMIT 1;
  END IF;

  -- ── Score: start at 100, subtract weighted penalties ──

  -- Attendance rate penalty
  IF v_rate_30d IS NOT NULL AND v_rate_30d < ATTENDANCE_TARGET THEN
    v_penalty := LEAST((ATTENDANCE_TARGET - v_rate_30d) * ATTENDANCE_SLOPE, ATTENDANCE_CAP);
    v_score := v_score - v_penalty;
    v_flags := v_flags || jsonb_build_object(
      'key',          'low_attendance',
      'severity',     CASE WHEN v_rate_30d < 75 THEN 'high' ELSE 'medium' END,
      'title',        'Attendance is below target',
      'detail',       format('30-day rate is %s%% (target ≥ %s%%)', v_rate_30d, ATTENDANCE_TARGET),
      'metric_value', v_rate_30d
    );
  END IF;

  -- Attendance delta penalty (separate flag, but use the worse penalty only)
  IF v_delta IS NOT NULL AND v_delta < DELTA_MILD THEN
    IF v_delta < DELTA_BAD THEN
      v_score := v_score - DELTA_BAD_PEN;
    ELSE
      v_score := v_score - DELTA_MILD_PEN;
    END IF;
    v_flags := v_flags || jsonb_build_object(
      'key',          'attendance_falling',
      'severity',     CASE WHEN v_delta < DELTA_BAD THEN 'high' ELSE 'medium' END,
      'title',        'Attendance is falling',
      'detail',       format('Down %s points vs. the prior 30 days', ROUND(ABS(v_delta), 1)),
      'metric_value', v_delta
    );
  END IF;

  -- Retention penalty
  IF v_retention IS NOT NULL AND v_retention < RETENTION_TARGET THEN
    v_penalty := LEAST((RETENTION_TARGET - v_retention) * RETENTION_SLOPE, RETENTION_CAP);
    v_score := v_score - v_penalty;
    v_flags := v_flags || jsonb_build_object(
      'key',          'retention_loss',
      'severity',     CASE WHEN v_retention < 80 THEN 'high' ELSE 'medium' END,
      'title',        'Retention is slipping',
      'detail',       format('%s%% retained over the last 90 days (target ≥ %s%%)', v_retention, RETENTION_TARGET),
      'metric_value', v_retention
    );
  END IF;

  -- Thin section penalties (stack)
  IF jsonb_array_length(v_thin_sections) > 0 THEN
    DECLARE
      s jsonb;
      sev numeric;
    BEGIN
      FOR s IN SELECT jsonb_array_elements(v_thin_sections) LOOP
        sev := (s->>'severity')::numeric;
        IF sev > THIN_SEV_BAD THEN
          v_score := v_score - THIN_PEN_BAD;
          v_flags := v_flags || jsonb_build_object(
            'key',          'thin_section',
            'severity',     'high',
            'title',        format('%s is critically thin', s->>'voice_part'),
            'detail',       format('Only %s of %s needed', s->>'current', s->>'target'),
            'metric_value', sev,
            'voice_part',   s->>'voice_part'
          );
        ELSIF sev > THIN_SEV_MILD THEN
          v_score := v_score - THIN_PEN_MILD;
          v_flags := v_flags || jsonb_build_object(
            'key',          'thin_section',
            'severity',     'medium',
            'title',        format('%s is below target', s->>'voice_part'),
            'detail',       format('%s of %s needed', s->>'current', s->>'target'),
            'metric_value', sev,
            'voice_part',   s->>'voice_part'
          );
        END IF;
      END LOOP;
    END;
  END IF;

  -- Readiness gap penalty + flag (highest priority — prepended)
  IF v_readiness_gap_days IS NOT NULL THEN
    v_score := v_score - READINESS_PEN;
    v_flags := jsonb_build_array(
      jsonb_build_object(
        'key',          'readiness_gap',
        'severity',     'high',
        'title',        'Underprepared for upcoming performance',
        'detail',       format('%s days to next required event; attendance only %s%%', v_readiness_gap_days, v_rate_30d),
        'metric_value', v_readiness_gap_days
      )
    ) || v_flags;
  END IF;

  -- Clamp score
  v_score := GREATEST(0, LEAST(100, ROUND(v_score)));

  INSERT INTO public.gw_health_snapshots (
    ensemble_id,
    attendance_rate_30d,
    attendance_delta,
    retention_rate,
    thin_sections,
    readiness_gap_days,
    stability_score,
    flags,
    weights_version
  )
  VALUES (
    p_ensemble_id,
    v_rate_30d,
    v_delta,
    v_retention,
    v_thin_sections,
    v_readiness_gap_days,
    v_score::int,
    v_flags,
    WEIGHTS_VERSION
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_health_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_health_snapshot(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. recompute_all_health_snapshots()
-- Iterates active ensembles, calls compute for each, returns the number of
-- snapshots written. Used by the cron job and the manual-trigger Edge
-- Function (when called without an ensemble_id).
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recompute_all_health_snapshots()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_id    uuid;
  e       record;
BEGIN
  FOR e IN
    SELECT id FROM public.gw_ensembles WHERE is_active = true
  LOOP
    v_id := public.compute_health_snapshot(e.id);
    IF v_id IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_all_health_snapshots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_all_health_snapshots() TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Nightly schedule (4 AM)
-- Unschedule first so re-running the migration is idempotent.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
    FROM cron.job WHERE jobname = 'recompute-health-nightly';
EXCEPTION WHEN OTHERS THEN
  -- swallow: job might not exist yet
  NULL;
END;
$$;

SELECT cron.schedule(
  'recompute-health-nightly',
  '0 4 * * *',
  $$SELECT public.recompute_all_health_snapshots()$$
);
