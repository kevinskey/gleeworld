-- Down migration for Program Health — Phase 0.
-- Removes everything 20260608115320_program_health_phase0.sql added.
-- Drops are CASCADE so dependent rows (none expected at Phase 0) are removed.

DELETE FROM public.gw_feature_flags WHERE flag_key IN ('program_health','health_ai');

DROP TABLE IF EXISTS public.gw_action_plans       CASCADE;
DROP TABLE IF EXISTS public.gw_health_snapshots   CASCADE;
DROP TABLE IF EXISTS public.gw_section_targets    CASCADE;
DROP TABLE IF EXISTS public.gw_ensemble_members   CASCADE;
DROP TABLE IF EXISTS public.gw_ensemble_directors CASCADE;
DROP TABLE IF EXISTS public.gw_ensembles          CASCADE;

ALTER TABLE public.gw_profiles DROP COLUMN IF EXISTS last_contacted_at;

DROP INDEX IF EXISTS public.idx_gw_events_ensemble;
ALTER TABLE public.gw_events   DROP COLUMN IF EXISTS ensemble_id;
