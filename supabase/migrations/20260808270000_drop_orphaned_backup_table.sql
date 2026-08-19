-- Drop gw_personal_scores_title_backup.
--
-- An orphaned one-off backup from a title cleanup on gw_personal_scores:
-- no migration creates it, nothing in src/ or supabase/functions/ references
-- it, and it sat readable platform-wide (RLS OFF) until 20260808110000
-- locked it deny-all. Kevin authorised removal 2026-08-08.
--
-- The 279 rows (id, old_title, old_composer, backed_up_at) were exported
-- first to /root/gw_personal_scores_title_backup_20260808.csv on the droplet,
-- so the drop is reversible in the only sense that matters.
DROP TABLE IF EXISTS public.gw_personal_scores_title_backup;
NOTIFY pgrst, 'reload schema';
