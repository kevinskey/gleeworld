-- get_tenant_public_site: same payload as get_public_site, but resolved from the
-- caller's tenant (x-tenant-slug header via anon_tenant_id / current_tenant_id)
-- instead of the site slug. Used by the tenant root landing page, which must keep
-- working even if the admin renames the /sites/<slug> address.
create or replace function public.get_tenant_public_site()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'slug', s.slug,
    'theme', s.theme,
    'blocks', coalesce(s.published_blocks, '[]'::jsonb),
    'published_at', s.published_at,
    'org_name', b.org_name,
    'logo_url', b.logo_url,
    'tagline', b.tagline,
    'active_addons', coalesce(
      (select jsonb_agg(ts.module_id)
         from gw_tenant_subscriptions ts
        where ts.tenant_id = s.tenant_id and ts.status = 'active'),
      '[]'::jsonb)
  )
  from gw_public_sites s
  left join gw_branding_settings b on b.tenant_id = s.tenant_id
  where s.tenant_id = coalesce(current_tenant_id(), anon_tenant_id())
    and s.is_published = true;
$$;

grant execute on function public.get_tenant_public_site() to anon, authenticated;
