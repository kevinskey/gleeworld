-- Down migration for Program Health — Phase 2.

DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
    FROM cron.job WHERE jobname = 'recompute-health-nightly';
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

DROP FUNCTION IF EXISTS public.recompute_all_health_snapshots();
DROP FUNCTION IF EXISTS public.compute_health_snapshot(uuid);

DROP INDEX IF EXISTS public.idx_gw_attendance_sessions_ensemble;
ALTER TABLE public.gw_attendance_sessions DROP COLUMN IF EXISTS ensemble_id;

-- Leave pg_cron / pg_net extensions installed; other features may use them.
