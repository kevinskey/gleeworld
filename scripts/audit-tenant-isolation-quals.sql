-- Read-only. Third and final diagnostic: show the actual predicates.
--
-- The exposure audit flags a table unless a RESTRICTIVE policy calls
-- current_tenant_id()/anon_tenant_id(). That is deliberately strict and will
-- produce false positives in two shapes that are actually safe:
--   1. a PERMISSIVE policy that scopes by tenant_id and is the ONLY policy
--      for that command (permissive policies OR together, so a lone one is
--      still a fence)
--   2. a per-user policy (user_id = auth.uid()), where cross-tenant leakage
--      is impossible regardless of whether tenant_id exists
-- Reading the quals is the only way to tell those apart from a real hole.

\set ON_ERROR_STOP on

\echo ''
\echo '=== Full predicates for every table flagged as exposed ==='
SELECT tablename, policyname, cmd, permissive,
       roles::text AS roles,
       COALESCE(qual, '(none)')       AS using_expr,
       COALESCE(with_check, '(none)') AS check_expr
  FROM pg_policies
 WHERE schemaname = 'public'
   AND policyname NOT LIKE 'demo_viewer%'
   AND tablename IN (
     'gw_merch_products','gw_merch_designs','gw_assistant_messages',
     'gw_assistant_threads','gw_personal_scores','gw_personal_scores_title_backup',
     'gw_course_grade_categories','gw_video_playlist_items','gw_video_playlists',
     'gw_fan_page_blocks','gw_fan_pages','gw_tenant_leads','gw_course_product',
     'gw_tenant_plans','gw_google_connections','gw_partner_invites',
     'gw_tenant_canvas_accounts','gw_partners','gw_canvas_instances',
     'gw_partner_scores'
   )
 ORDER BY tablename, cmd, policyname;

\echo ''
\echo '=== Tables above that have NO policy at all (RLS on = deny all,'
\echo '===  RLS off = wide open to anyone with a session) ==='
SELECT c.relname, c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname='public' AND p.tablename = c.relname) AS n_policies
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r'
   AND c.relname IN (
     'gw_merch_products','gw_merch_designs','gw_assistant_messages',
     'gw_assistant_threads','gw_personal_scores','gw_personal_scores_title_backup',
     'gw_course_grade_categories','gw_video_playlist_items','gw_video_playlists',
     'gw_fan_page_blocks','gw_fan_pages','gw_tenant_leads','gw_course_product',
     'gw_tenant_plans','gw_google_connections','gw_partner_invites',
     'gw_tenant_canvas_accounts','gw_partners','gw_canvas_instances',
     'gw_partner_scores'
   )
 ORDER BY c.relrowsecurity, n_policies, c.relname;

\echo ''
\echo '=== gw_personal_scores_title_backup: what is it, and does it duplicate'
\echo '===  a table that IS protected? (RLS is off on it, 279 rows) ==='
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='gw_personal_scores_title_backup'
 ORDER BY ordinal_position;
