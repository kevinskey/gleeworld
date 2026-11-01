-- Member access (docs/reference/member-access.md), proven against real rows:
--
--   * a person HOMED in workspace A, invited to workspace B, sees what B's
--     admin shares with members and nothing B has not shared;
--   * removing the membership removes the access;
--   * a public self-signup on B's site is audience ('fan'), not a member, and
--     sees nothing shared with "Everyone"; an invitation promotes it;
--   * an admin of A who merely holds a row in B is NOT an admin in B.
--
-- Everything runs in one transaction and ROLLBACKs.
--
--   psql ... -f supabase/migrations/tests/member_access_test.sql

\set ON_ERROR_STOP on
BEGIN;

-- Fixture: two distinct tenants and a plain (non-admin, non-librarian) account
-- homed in A that holds no row in B. Placeholder profiles with no auth user
-- are skipped (the membership FK would reject them).
CREATE TEMP TABLE _fx ON COMMIT DROP AS
WITH a AS (
  SELECT p.user_id, p.tenant_id AS tenant_a, p.email
    FROM gw_profiles p
   WHERE p.user_id IS NOT NULL
     AND p.tenant_id IS NOT NULL
     AND coalesce(p.disabled, false) = false
     AND coalesce(p.is_admin, false) = false
     AND coalesce(p.is_super_admin, false) = false
     AND coalesce(p.role, '') <> 'librarian'
     AND NOT public.has_username_permission(p.email, 'librarian_dashboard')
     AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id)
   ORDER BY p.created_at NULLS LAST
   LIMIT 1
)
SELECT a.user_id,
       a.tenant_a,
       (SELECT t.id FROM gw_tenants t
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
    RAISE EXCEPTION 'Need a plain account and a second tenant it holds no row in';
  END IF;
  RAISE NOTICE 'user % homed in %, testing against %', u, a, b;
END $$;

-- Two scores in B, written as the owner (bypasses RLS): one shared with
-- everyone, one not shared at all.
INSERT INTO gw_sheet_music (id, title, tenant_id, shared_with_members, is_archived)
SELECT '0a000000-0000-4000-8000-000000000001', 'MEMBER ACCESS TEST shared',  tenant_b, true,  false FROM _fx;
INSERT INTO gw_sheet_music (id, title, tenant_id, shared_with_members, is_archived)
SELECT '0a000000-0000-4000-8000-000000000002', 'MEMBER ACCESS TEST private', tenant_b, false, false FROM _fx;

-- Impersonate a person on B's site: JWT names their HOME tenant, the site
-- header names B. This is exactly what the browser sends.
CREATE OR REPLACE FUNCTION pg_temp.act_as(p_user uuid, p_home uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE slug_b text;
BEGIN
  SELECT t.slug INTO slug_b FROM gw_tenants t JOIN _fx ON t.id = _fx.tenant_b;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated', 'tenant_id', p_home::text)::text, true);
  PERFORM set_config('request.headers',
    json_build_object('x-tenant-slug', slug_b)::text, true);
END $$;

\echo ''
\echo '=== 1. Not yet invited to B: scoped to the HOME workspace, nothing of B is visible ==='
DO $$
DECLARE n int; acc record; slug_b text;
BEGIN
  SELECT t.slug INTO slug_b FROM gw_tenants t JOIN _fx ON t.id = _fx.tenant_b;
  PERFORM pg_temp.act_as((SELECT user_id FROM _fx), (SELECT tenant_a FROM _fx));
  SET LOCAL ROLE authenticated;
  SELECT * INTO acc FROM gw_my_access();
  SELECT count(*) INTO n FROM gw_sheet_music_browse WHERE title LIKE 'MEMBER ACCESS TEST%';
  RESET ROLE;
  RAISE NOTICE 'scoped to % (B is %), visible=%', acc.tenant_slug, slug_b, n;
  IF acc.tenant_slug IS NOT DISTINCT FROM slug_b THEN RAISE EXCEPTION 'FAIL: not invited, yet scoped to B'; END IF;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: not invited, yet sees % of B''s scores', n; END IF;
END $$;

\echo ''
\echo '=== 2. Invited to B (gw_grant_membership): member, sees the shared score only ==='
SELECT gw_grant_membership(user_id, tenant_b, 'member') AS granted_role FROM _fx;

DO $$
DECLARE n_shared int; n_private int; acc record; slug_b text;
BEGIN
  SELECT t.slug INTO slug_b FROM gw_tenants t JOIN _fx ON t.id = _fx.tenant_b;
  PERFORM pg_temp.act_as((SELECT user_id FROM _fx), (SELECT tenant_a FROM _fx));
  SET LOCAL ROLE authenticated;
  SELECT * INTO acc FROM gw_my_access();
  SELECT count(*) INTO n_shared  FROM gw_sheet_music_browse WHERE id = '0a000000-0000-4000-8000-000000000001';
  SELECT count(*) INTO n_private FROM gw_sheet_music_browse WHERE id = '0a000000-0000-4000-8000-000000000002';
  RESET ROLE;
  RAISE NOTICE 'access=% shared=% private=%', acc, n_shared, n_private;
  IF acc.tenant_slug IS DISTINCT FROM slug_b THEN RAISE EXCEPTION 'FAIL: invited, but scoped to % instead of B', acc.tenant_slug; END IF;
  IF NOT acc.is_member THEN RAISE EXCEPTION 'FAIL: invited, but not counted as a member of B'; END IF;
  IF acc.is_admin_here THEN RAISE EXCEPTION 'FAIL: a plain invitee counts as an admin of B'; END IF;
  IF n_shared <> 1 THEN RAISE EXCEPTION 'FAIL: invited member cannot see the score shared with everyone'; END IF;
  IF n_private <> 0 THEN RAISE EXCEPTION 'FAIL: invited member sees a score that was never shared'; END IF;
END $$;

\echo ''
\echo '=== 3. Shared by name instead of everyone: still visible ==='
UPDATE gw_sheet_music
   SET shared_with_members = false,
       shared_with_users = ARRAY[(SELECT user_id FROM _fx)]
 WHERE id = '0a000000-0000-4000-8000-000000000001';

DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as((SELECT user_id FROM _fx), (SELECT tenant_a FROM _fx));
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM gw_sheet_music_browse WHERE id = '0a000000-0000-4000-8000-000000000001';
  RESET ROLE;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: member named on the share cannot see the score'; END IF;
END $$;

\echo ''
\echo '=== 4. Membership removed: access removed ==='
DELETE FROM gw_tenant_members WHERE (user_id, tenant_id) = (SELECT user_id, tenant_b FROM _fx);
UPDATE gw_sheet_music SET shared_with_members = true, shared_with_users = '{}'
 WHERE id = '0a000000-0000-4000-8000-000000000001';

DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as((SELECT user_id FROM _fx), (SELECT tenant_a FROM _fx));
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM gw_sheet_music_browse WHERE title LIKE 'MEMBER ACCESS TEST%';
  RESET ROLE;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: membership removed, yet still sees % score(s)', n; END IF;
END $$;

\echo ''
\echo '=== 5. Public self-signup on B claiming role=member is AUDIENCE: sees no "Everyone" share ==='
INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at)
SELECT '0d000000-0000-4000-8000-00000000000d', 'member-access-test-signup@example.invalid',
       json_build_object('tenant_slug', t.slug, 'role', 'member')::jsonb, now()
  FROM gw_tenants t JOIN _fx ON t.id = _fx.tenant_b;

DO $$
DECLARE r text; n int; acc record;
BEGIN
  SELECT lower(m.role) INTO r FROM gw_tenant_members m
   WHERE m.user_id = '0d000000-0000-4000-8000-00000000000d' AND m.tenant_id = (SELECT tenant_b FROM _fx);
  IF r IS DISTINCT FROM 'fan' THEN RAISE EXCEPTION 'FAIL: self-signup got membership role % (expected fan)', r; END IF;

  PERFORM pg_temp.act_as('0d000000-0000-4000-8000-00000000000d', (SELECT tenant_b FROM _fx));
  SET LOCAL ROLE authenticated;
  SELECT * INTO acc FROM gw_my_access();
  SELECT count(*) INTO n FROM gw_sheet_music_browse WHERE title LIKE 'MEMBER ACCESS TEST%';
  RESET ROLE;
  RAISE NOTICE 'self-signup access=% visible=%', acc, n;
  IF NOT acc.has_membership THEN RAISE EXCEPTION 'FAIL: self-signup holds no row in B'; END IF;
  IF acc.is_member THEN RAISE EXCEPTION 'FAIL: self-signup counts as a MEMBER of B'; END IF;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: self-signup sees % score(s) shared with everyone', n; END IF;
END $$;

\echo '=== 5b. The same account, once invited, is promoted from fan to member and sees the share ==='
SELECT gw_grant_membership('0d000000-0000-4000-8000-00000000000d', tenant_b, 'member') AS granted_role FROM _fx;
DO $$
DECLARE n int; acc record;
BEGIN
  PERFORM pg_temp.act_as('0d000000-0000-4000-8000-00000000000d', (SELECT tenant_b FROM _fx));
  SET LOCAL ROLE authenticated;
  SELECT * INTO acc FROM gw_my_access();
  SELECT count(*) INTO n FROM gw_sheet_music_browse WHERE id = '0a000000-0000-4000-8000-000000000001';
  RESET ROLE;
  IF NOT acc.is_member THEN RAISE EXCEPTION 'FAIL: invitation did not promote the fan row'; END IF;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: promoted member cannot see the score shared with everyone'; END IF;
END $$;

\echo '=== 5c. gw_grant_membership never grants admin and never downgrades ==='
DO $$
BEGIN
  BEGIN
    PERFORM gw_grant_membership('0d000000-0000-4000-8000-00000000000d', (SELECT tenant_b FROM _fx), 'admin');
    RAISE EXCEPTION 'FAIL: gw_grant_membership granted admin';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF gw_grant_membership('0d000000-0000-4000-8000-00000000000d', (SELECT tenant_b FROM _fx), 'fan') <> 'member' THEN
    RAISE EXCEPTION 'FAIL: gw_grant_membership downgraded a member to fan';
  END IF;
END $$;

\echo ''
\echo '=== 6. An admin of A holding a plain row in B is NOT an admin in B (skipped if A has no non-platform flag-admin) ==='
DO $$
DECLARE adm uuid; acc record; n_private int;
BEGIN
  SELECT p.user_id INTO adm FROM gw_profiles p
   WHERE p.tenant_id = (SELECT tenant_a FROM _fx)
     AND p.user_id IS NOT NULL
     AND p.is_admin = true
     -- not a platform super admin: those are admins everywhere by design
     AND coalesce(p.is_super_admin, false) = false
     AND coalesce(p.disabled, false) = false
     AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id)
     AND NOT EXISTS (SELECT 1 FROM gw_tenant_members m WHERE m.user_id = p.user_id AND m.tenant_id = (SELECT tenant_b FROM _fx))
   ORDER BY p.created_at NULLS LAST LIMIT 1;
  IF adm IS NULL THEN RAISE NOTICE 'skipped: no flag-admin of A without a row in B'; RETURN; END IF;

  INSERT INTO gw_tenant_members (user_id, tenant_id, role) VALUES (adm, (SELECT tenant_b FROM _fx), 'fan');
  -- JWT deliberately names A with tenant_slug of A's site, as a real session would.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', adm::text, 'role', 'authenticated',
                      'tenant_id', (SELECT tenant_a FROM _fx)::text,
                      'tenant_slug', (SELECT t.slug FROM gw_tenants t JOIN _fx ON t.id = _fx.tenant_a))::text, true);
  PERFORM set_config('request.headers',
    json_build_object('x-tenant-slug', (SELECT t.slug FROM gw_tenants t JOIN _fx ON t.id = _fx.tenant_b))::text, true);
  SET LOCAL ROLE authenticated;
  SELECT * INTO acc FROM gw_my_access();
  SELECT count(*) INTO n_private FROM gw_sheet_music_browse WHERE id = '0a000000-0000-4000-8000-000000000002';
  RESET ROLE;
  RAISE NOTICE 'foreign admin in B: access=% private_visible=%', acc, n_private;
  IF acc.is_admin_here THEN RAISE EXCEPTION 'FAIL: an admin of A counts as an admin of B'; END IF;
  IF n_private <> 0 THEN RAISE EXCEPTION 'FAIL: an admin of A sees B''s unshared score'; END IF;
END $$;

\echo ''
\echo '=== PASS — invited = member, audience ≠ member, member sees what is shared, admins are per workspace ==='

ROLLBACK;
