-- Member access: a person invited to workspace B — whose account is HOMED in
-- workspace A — sees what B's admin shares with members, and nothing B has
-- not shared. Removing the membership removes the access.
--
-- This is the Babette case (2026-10-31): a GleeWorld account invited to
-- Yo-Doc. Everything runs in a transaction and ROLLBACKs.
--
--   psql ... -f supabase/migrations/tests/member_access_test.sql

\set ON_ERROR_STOP on
BEGIN;

-- Fixture: two distinct tenants and a non-admin account homed in A that is
-- NOT a member of B.
CREATE TEMP TABLE _fx ON COMMIT DROP AS
WITH a AS (
  SELECT p.user_id, p.tenant_id AS tenant_a
    FROM gw_profiles p
   WHERE p.tenant_id IS NOT NULL
     AND coalesce(p.is_admin, false) = false
     AND coalesce(p.is_super_admin, false) = false
     AND coalesce(p.role, '') <> 'librarian'
   ORDER BY p.created_at NULLS LAST
   LIMIT 1
)
SELECT a.user_id,
       a.tenant_a,
       (SELECT t.id   FROM gw_tenants t
         WHERE t.id <> a.tenant_a
           AND NOT EXISTS (SELECT 1 FROM gw_tenant_members m
                            WHERE m.user_id = a.user_id AND m.tenant_id = t.id)
         ORDER BY t.slug LIMIT 1) AS tenant_b
  FROM a;

DO $$
DECLARE u uuid; a uuid; b uuid;
BEGIN
  SELECT user_id, tenant_a, tenant_b INTO u, a, b FROM _fx;
  IF u IS NULL OR a IS NULL OR b IS NULL THEN
    RAISE EXCEPTION 'Need a non-admin account and a second tenant it is not a member of';
  END IF;
  RAISE NOTICE 'user % homed in %, testing against %', u, a, b;
END $$;

-- Two scores in B, written as the owner (bypasses RLS): one shared with
-- everyone, one not shared at all.
INSERT INTO gw_sheet_music (id, title, tenant_id, shared_with_members, is_archived)
SELECT '0a000000-0000-4000-8000-000000000001', 'MEMBER ACCESS TEST shared',   tenant_b, true,  false FROM _fx;
INSERT INTO gw_sheet_music (id, title, tenant_id, shared_with_members, is_archived)
SELECT '0a000000-0000-4000-8000-000000000002', 'MEMBER ACCESS TEST private',  tenant_b, false, false FROM _fx;

-- Impersonate the person on B's site: JWT still names their HOME tenant (A),
-- the site header names B. This is exactly what the browser sends.
CREATE OR REPLACE FUNCTION pg_temp.act_as_user_on_b() RETURNS void LANGUAGE plpgsql AS $$
DECLARE u uuid; a uuid; slug_b text;
BEGIN
  SELECT user_id, tenant_a INTO u, a FROM _fx;
  SELECT t.slug INTO slug_b FROM gw_tenants t JOIN _fx ON t.id = _fx.tenant_b;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', u::text, 'role', 'authenticated', 'tenant_id', a::text)::text, true);
  PERFORM set_config('request.headers',
    json_build_object('x-tenant-slug', slug_b)::text, true);
END $$;

\echo ''
\echo '=== Not yet a member of B: the request is scoped to their HOME workspace, so nothing of B is visible ==='
DO $$
DECLARE n int; acc record; slug_b text;
BEGIN
  SELECT t.slug INTO slug_b FROM gw_tenants t JOIN _fx ON t.id = _fx.tenant_b;
  PERFORM pg_temp.act_as_user_on_b();
  SET LOCAL ROLE authenticated;
  SELECT * INTO acc FROM gw_my_access();
  SELECT count(*) INTO n FROM gw_sheet_music_browse WHERE title LIKE 'MEMBER ACCESS TEST%';
  RESET ROLE;
  RAISE NOTICE 'scoped to % (B is %), visible=%', acc.tenant_slug, slug_b, n;
  IF acc.tenant_slug IS NOT DISTINCT FROM slug_b THEN RAISE EXCEPTION 'FAIL: not invited, yet scoped to B'; END IF;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: not invited, yet sees % of B''s scores', n; END IF;
END $$;

\echo '=== Invite (membership row in B): sees the shared score only ==='
INSERT INTO gw_tenant_members (user_id, tenant_id, role)
SELECT user_id, tenant_b, 'member' FROM _fx
ON CONFLICT (user_id, tenant_id) DO NOTHING;

DO $$
DECLARE n_shared int; n_private int; is_m boolean; acc record;
BEGIN
  PERFORM pg_temp.act_as_user_on_b();
  SET LOCAL ROLE authenticated;
  SELECT gw_is_member() INTO is_m;
  SELECT * INTO acc FROM gw_my_access();
  SELECT count(*) INTO n_shared  FROM gw_sheet_music_browse WHERE id = '0a000000-0000-4000-8000-000000000001';
  SELECT count(*) INTO n_private FROM gw_sheet_music_browse WHERE id = '0a000000-0000-4000-8000-000000000002';
  RESET ROLE;
  RAISE NOTICE 'member=% access=% shared=% private=%', is_m, acc, n_shared, n_private;
  IF NOT is_m THEN RAISE EXCEPTION 'FAIL: invited, but not counted as a member of B'; END IF;
  IF n_shared <> 1 THEN RAISE EXCEPTION 'FAIL: invited member cannot see the score shared with everyone'; END IF;
  IF n_private <> 0 THEN RAISE EXCEPTION 'FAIL: invited member sees a score that was never shared'; END IF;
  IF acc.tenant_slug IS DISTINCT FROM (SELECT t.slug FROM gw_tenants t JOIN _fx ON t.id = _fx.tenant_b) THEN
    RAISE EXCEPTION 'FAIL: gw_my_access() scoped to % instead of B', acc.tenant_slug;
  END IF;
END $$;

\echo ''
\echo '=== Shared by name instead of everyone: still visible ==='
UPDATE gw_sheet_music
   SET shared_with_members = false,
       shared_with_users = ARRAY[(SELECT user_id FROM _fx)]
 WHERE id = '0a000000-0000-4000-8000-000000000001';

DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as_user_on_b();
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM gw_sheet_music_browse WHERE id = '0a000000-0000-4000-8000-000000000001';
  RESET ROLE;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: member named on the share cannot see the score'; END IF;
END $$;

\echo ''
\echo '=== Membership removed: access removed ==='
DELETE FROM gw_tenant_members WHERE (user_id, tenant_id) = (SELECT user_id, tenant_b FROM _fx);

DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as_user_on_b();
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM gw_sheet_music_browse WHERE title LIKE 'MEMBER ACCESS TEST%';
  RESET ROLE;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: membership removed, yet still sees % score(s)', n; END IF;
END $$;

\echo ''
\echo '=== PASS — invited = member, member sees what is shared, and only that ==='

ROLLBACK;
