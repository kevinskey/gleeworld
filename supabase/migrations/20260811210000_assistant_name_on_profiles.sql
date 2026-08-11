-- Per-USER assistant name (Kevin, 2026-08-11: "let users name their
-- assistant. per user not per tenant"). gw_profiles is UNIQUE(user_id) —
-- one row per user across all tenants — so a column here is the only
-- storage that is genuinely per-user-global (gw_user_preferences keys on
-- tenant_id and would fragment the name per workspace). Users can already
-- update their own row (gw_profiles_update_policy), so no policy changes.
--
-- Self-hosted: apply by hand as supabase_admin (no migration runner):
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     -v ON_ERROR_STOP=1 --single-transaction -f /tmp/this_file.sql

alter table public.gw_profiles add column if not exists assistant_name text;
