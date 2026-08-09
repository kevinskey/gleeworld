-- Per-role default shelf: the My Tools set a member of this tenant starts
-- with before they arrange their own. Sits beside hidden_items on the same
-- (tenant_id, role) row — that table is already partitioned by role, so a
-- role-keyed JSON blob would nest role inside role.
--
-- Empty array means "no tenant default set" and callers fall back to the
-- platform role default (DEFAULT_TOOLS_FACULTY / DEFAULT_TOOLS_STUDENT).
-- NULL is not used: the column is NOT NULL DEFAULT '{}' so readers never
-- branch on two kinds of absent.
--
-- Values are catalog keys (CatalogEntry.key), NOT routes. hidden_items
-- stores ROUTES; these two columns deliberately differ, because hiding is
-- route-based (it predates the catalog) and shelves are key-based.
-- Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6.2
--
-- Stamp note: the brief specified 20260808120000, but that stamp was
-- already taken (20260808120000_all_state_layer1_canon.sql). Bumped to the
-- next free minute, 20260808320000 (after the last 2026-08-08 migration,
-- 20260808310000_songwriting_sensitive_bucket.sql).

ALTER TABLE public.gw_tenant_nav_prefs
  ADD COLUMN IF NOT EXISTS default_tools text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.gw_tenant_nav_prefs.default_tools IS
  'Ordered CatalogEntry.key list, max 8, that new members of this role start with. Empty = use the platform default.';
