-- get_nav_prefs(): read your own nav prefs from ANY tenant.
--
-- user_preferences is UNIQUE(user_id) — one row per user — and
-- save_nav_item_order re-stamps tenant_id to current_tenant_id() on every
-- save. But the read path was tenant-walled by RLS, so a member active on
-- two tenants ping-ponged: each site saw "no record", showed the first-run
-- setup sheet again, and each dismissal moved the row to the current
-- tenant (Kevin, 2026-08-13: "mine appears over and over"). The record is
-- personal, not per-workspace — reads must be tenant-blind like the write
-- RPC already is.
--
-- Self-hosted: record-only file; apply by hand as supabase_admin.
CREATE OR REPLACE FUNCTION public.get_nav_prefs()
RETURNS TABLE (nav_item_order jsonb, home_tile_layout jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT up.nav_item_order, up.home_tile_layout
  FROM public.user_preferences up
  WHERE up.user_id = auth.uid();
$$;

-- Definer fn: lock to signed-in callers only ('revoke from public' alone
-- is insufficient — the 0014 lesson; here authenticated is the audience,
-- and the fn returns only the caller's own row).
REVOKE ALL ON FUNCTION public.get_nav_prefs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_nav_prefs() TO authenticated;
