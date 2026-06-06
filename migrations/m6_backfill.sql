BEGIN;
SET session_replication_role = 'replica';

DO $$
DECLARE tbl text; spelman_id uuid;
  keep text[] := ARRAY[
    'gw_tenants','gw_tenant_members','gw_feature_flags','gw_app_functions',
    'gw_permissions','gw_roles','gw_tax_regions','gw_webhook_events',
    'app_roles','user_roles','user_roles_multi','permission_groups',
    'permission_group_permissions','user_permission_groups',
    'username_permissions','username_module_permissions','theme_templates',
    'rate_limits','security_rate_limits','notification_sounds','usccb_readings'
  ];
BEGIN
  SELECT id INTO spelman_id FROM public.gw_tenants WHERE slug='spelman';
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname='public' AND NOT (tablename = ANY(keep))
  LOOP
    EXECUTE format('UPDATE public.%I SET tenant_id=%L WHERE tenant_id IS NULL', tbl, spelman_id);
  END LOOP;
  UPDATE storage.objects SET tenant_id=spelman_id WHERE tenant_id IS NULL;
  UPDATE storage.buckets SET tenant_id=spelman_id WHERE tenant_id IS NULL;
END $$;

INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
SELECT u.id, t.id,
       CASE WHEN u.is_super_admin THEN 'super_admin' ELSE 'member' END
FROM auth.users u
CROSS JOIN public.gw_tenants t
WHERE t.slug='spelman'
ON CONFLICT DO NOTHING;

SET session_replication_role = 'origin';
COMMIT;
