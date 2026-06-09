-- Program Health module — Phase 5 rollback
DROP TRIGGER IF EXISTS trg_gw_contact_log_touch_profile ON public.gw_contact_log;
DROP FUNCTION IF EXISTS public.gw_contact_log_touch_profile();
DROP TABLE IF EXISTS public.gw_contact_log;
