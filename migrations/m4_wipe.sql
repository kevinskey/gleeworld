BEGIN;
SET session_replication_role = 'replica';

DO $$
DECLARE tbl text;
  keep text[] := ARRAY[
    'gw_tenants','gw_tenant_members',
    'gw_feature_flags','gw_app_functions',
    'gw_permissions','gw_roles','gw_tax_regions','gw_webhook_events',
    'app_roles','user_roles','user_roles_multi',
    'permission_groups','permission_group_permissions','user_permission_groups',
    'username_permissions','username_module_permissions',
    'theme_templates','rate_limits','security_rate_limits',
    'notification_sounds','usccb_readings'
  ];
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname='public' AND NOT (tablename = ANY(keep))
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I CASCADE', tbl);
  END LOOP;
END $$;

TRUNCATE storage.objects CASCADE;
TRUNCATE storage.buckets CASCADE;
TRUNCATE auth.users CASCADE;

COMMIT;

SELECT 'after-wipe gw_courses' as t, COUNT(*) FROM public.gw_courses
UNION ALL SELECT 'auth.users', COUNT(*) FROM auth.users
UNION ALL SELECT 'storage.objects', COUNT(*) FROM storage.objects
UNION ALL SELECT 'gw_tenants (preserved)', COUNT(*) FROM public.gw_tenants
UNION ALL SELECT 'gw_tenant_members (preserved)', COUNT(*) FROM public.gw_tenant_members;
