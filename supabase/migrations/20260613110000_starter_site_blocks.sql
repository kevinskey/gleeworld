-- Extend the new-tenant public-site starter template from 3 blocks (header,
-- hero, events) to 7 blocks (header, hero, events, about, music-player,
-- videos, contact). Only seeds tenants whose gw_site_blocks is empty, so
-- existing tenants keep whatever they've already configured.

create or replace function public.gw_activate_public_site()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_tenant uuid := current_tenant_id();
  v_slug text;
  v_org text;
  v_logo text;
  v_tagline text;
  v_site gw_public_sites;
begin
  if v_tenant is null then
    raise exception 'no tenant in session';
  end if;
  if not exists (
    select 1 from gw_profiles p
    where p.user_id = auth.uid()
      and (p.is_admin = true or p.is_super_admin = true or p.role in ('admin','super-admin','executive'))
  ) then
    raise exception 'admin required';
  end if;

  select t.slug into v_slug from gw_tenants t where t.id = v_tenant;
  select b.org_name, b.logo_url, b.tagline into v_org, v_logo, v_tagline
    from gw_branding_settings b where b.tenant_id = v_tenant limit 1;

  insert into gw_public_sites (tenant_id, slug)
  values (v_tenant, v_slug)
  on conflict (tenant_id) do nothing;

  select * into v_site from gw_public_sites where tenant_id = v_tenant;

  if not exists (select 1 from gw_site_blocks where tenant_id = v_tenant) then
    insert into gw_site_blocks (tenant_id, block_type, position, config) values
      (v_tenant, 'header', 0, jsonb_build_object(
        'siteName', coalesce(v_org, v_slug),
        'logoUrl', coalesce(v_logo, ''),
        'navLinks', jsonb_build_array(
          jsonb_build_object('label', 'Events', 'url', '#events'),
          jsonb_build_object('label', 'About', 'url', '#about'),
          jsonb_build_object('label', 'Listen', 'url', '#music'),
          jsonb_build_object('label', 'Watch', 'url', '#watch'),
          jsonb_build_object('label', 'Contact', 'url', '#contact')))),
      (v_tenant, 'hero', 1, jsonb_build_object(
        'variant', 'image',
        'headline', 'Welcome to ' || coalesce(v_org, v_slug),
        'subheadline', coalesce(v_tagline, ''),
        'ctaLabel', 'See upcoming events',
        'ctaUrl', '#events')),
      (v_tenant, 'events', 2, jsonb_build_object('style', 'month', 'limit', 12, 'heading', 'Upcoming events')),
      (v_tenant, 'about', 3, jsonb_build_object(
        'title', 'About us',
        'body', 'Share your story, mission, and what makes your program special.',
        'imageSide', 'right')),
      (v_tenant, 'music-player', 4, jsonb_build_object('heading', 'Listen', 'tracks', '[]'::jsonb)),
      (v_tenant, 'videos', 5, jsonb_build_object('heading', 'Watch', 'layout', 'grid', 'videos', '[]'::jsonb)),
      (v_tenant, 'contact', 6, jsonb_build_object('email', '', 'phone', ''));
  end if;

  return to_jsonb(v_site);
end;
$$;

revoke all on function public.gw_activate_public_site() from public;
grant execute on function public.gw_activate_public_site() to authenticated;
