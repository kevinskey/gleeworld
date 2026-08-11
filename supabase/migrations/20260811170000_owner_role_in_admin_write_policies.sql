-- A tenant's OWNER outranks its admins, but three admin-write policies
-- enumerated membership roles as ('super_admin','super-admin','admin') and
-- left 'owner' out — so the one person who owns the workspace could read
-- but not manage nav prefs, landing sections, or subscriptions unless they
-- also happened to hold an admin profile there. Found 2026-08-11 while
-- making kpj64110 (role 'owner' on the kevin tenant) an effective admin
-- of Kevin's World. is_platform_owner() does not cover it: that requires
-- a tenant_slug='main' JWT claim real sessions don't carry.
--
-- Self-hosted note: apply by hand as supabase_admin (no migration runner):
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     -v ON_ERROR_STOP=1 --single-transaction -f /tmp/this_file.sql

alter policy nav_prefs_admin_write on public.gw_tenant_nav_prefs
  using (
    is_platform_owner() or exists (
      select 1 from gw_tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id = current_tenant_id()
        and tm.role = any (array['super_admin','super-admin','admin','owner'])
    )
  )
  with check (
    is_platform_owner() or exists (
      select 1 from gw_tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id = current_tenant_id()
        and tm.role = any (array['super_admin','super-admin','admin','owner'])
    )
  );

alter policy landing_sections_admin_write on public.gw_landing_sections
  using (
    tenant_id = current_tenant_id() and (
      is_platform_owner() or exists (
        select 1 from gw_tenant_members tm
        where tm.user_id = auth.uid()
          and tm.tenant_id = current_tenant_id()
          and tm.role = any (array['super_admin','super-admin','admin','owner'])
      )
    )
  )
  with check (
    tenant_id = current_tenant_id() and (
      is_platform_owner() or exists (
        select 1 from gw_tenant_members tm
        where tm.user_id = auth.uid()
          and tm.tenant_id = current_tenant_id()
          and tm.role = any (array['super_admin','super-admin','admin','owner'])
      )
    )
  );

alter policy tenant_subs_admin_write on public.gw_tenant_subscriptions
  using (
    tenant_id = current_tenant_id() and (
      is_platform_owner() or exists (
        select 1 from gw_tenant_members tm
        where tm.user_id = auth.uid()
          and tm.tenant_id = current_tenant_id()
          and tm.role = any (array['super_admin','super-admin','admin','owner'])
      )
    )
  )
  with check (
    tenant_id = current_tenant_id() and (
      is_platform_owner() or exists (
        select 1 from gw_tenant_members tm
        where tm.user_id = auth.uid()
          and tm.tenant_id = current_tenant_id()
          and tm.role = any (array['super_admin','super-admin','admin','owner'])
      )
    )
  );
