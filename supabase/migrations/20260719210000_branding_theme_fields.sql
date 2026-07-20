-- Move the public site's theme knobs onto gw_branding_settings so branding
-- is the single source of truth. Previously the Header block's editor form
-- carried its own primary/accent/font/letter-spacing controls that wrote to
-- gw_public_sites.theme. Those controls are being removed; the public site
-- now derives those fields from branding on every render.
--
-- primary_color already lives on gw_branding_settings — we're only adding
-- the three additional fields the Header block used to own.

alter table public.gw_branding_settings
  add column if not exists accent_color text,
  add column if not exists font_family text,
  add column if not exists letter_spacing numeric(4,3);

-- Recreate the two payload RPCs to expose the new branding fields to the
-- public site renderer (PublicSiteView reads this payload). Both functions
-- keep their existing signature + grants. `theme` on gw_public_sites still
-- carries package/radius/section-padding/divider knobs — those remain
-- page-scoped; only the four brand fields move.

create or replace function public.get_public_site(p_slug text)
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
    'primary_color', b.primary_color,
    'accent_color', b.accent_color,
    'font_family', b.font_family,
    'letter_spacing', b.letter_spacing,
    'active_addons', coalesce(
      (select jsonb_agg(ts.module_id)
         from gw_tenant_subscriptions ts
        where ts.tenant_id = s.tenant_id and ts.status = 'active'),
      '[]'::jsonb)
  )
  from gw_public_sites s
  left join gw_branding_settings b on b.tenant_id = s.tenant_id
  where s.slug = p_slug and s.is_published = true;
$$;

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
    'primary_color', b.primary_color,
    'accent_color', b.accent_color,
    'font_family', b.font_family,
    'letter_spacing', b.letter_spacing,
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

grant execute on function public.get_public_site(text) to anon, authenticated;
grant execute on function public.get_tenant_public_site() to anon, authenticated;
