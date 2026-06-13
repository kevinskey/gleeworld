-- Fan landing page builder: parallel of gw_public_sites + gw_site_blocks, but
-- the published snapshot is gated to AUTHENTICATED users only (fans, members,
-- admins). Anon visitors get nothing. The same block registry powers both
-- pages — fan page just has its own draft + snapshot.

create table if not exists public.gw_fan_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default current_tenant_id() unique,
  theme jsonb not null default '{}'::jsonb,
  published_blocks jsonb,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gw_fan_page_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default current_tenant_id(),
  block_type text not null,
  position int not null default 0,
  config jsonb not null default '{}'::jsonb,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gw_fan_page_blocks_tenant_pos_idx
  on public.gw_fan_page_blocks(tenant_id, position);

alter table public.gw_fan_pages enable row level security;
alter table public.gw_fan_page_blocks enable row level security;

-- Tenant + admin scoping for the editor (super-admin OR admin can manage
-- their tenant's fan page). All reads/writes go through these policies; the
-- published-snapshot read path lives in an RPC so anon never touches the
-- table directly.
drop policy if exists fan_pages_admin_manage on public.gw_fan_pages;
create policy fan_pages_admin_manage on public.gw_fan_pages
  for all to authenticated
  using (
    tenant_id = current_tenant_id()
    and exists (
      select 1 from gw_profiles p
      where p.user_id = auth.uid()
        and (p.is_admin = true or p.is_super_admin = true
             or p.role in ('admin','super-admin','executive'))
    )
  )
  with check (tenant_id = current_tenant_id());

drop policy if exists fan_blocks_admin_manage on public.gw_fan_page_blocks;
create policy fan_blocks_admin_manage on public.gw_fan_page_blocks
  for all to authenticated
  using (
    tenant_id = current_tenant_id()
    and exists (
      select 1 from gw_profiles p
      where p.user_id = auth.uid()
        and (p.is_admin = true or p.is_super_admin = true
             or p.role in ('admin','super-admin','executive'))
    )
  )
  with check (tenant_id = current_tenant_id());

-- Anon-callable? No. The fan page is for authenticated visitors only.
-- get_tenant_fan_page (SECURITY DEFINER) returns the published snapshot for
-- the current user's tenant. If no JWT, returns null — caller renders a
-- "please sign in" gate.
create or replace function public.get_tenant_fan_page()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'theme', p.theme,
    'blocks', coalesce(p.published_blocks, '[]'::jsonb),
    'published_at', p.published_at,
    'org_name', b.org_name,
    'logo_url', b.logo_url,
    'tagline', b.tagline
  )
  from gw_fan_pages p
  left join gw_branding_settings b on b.tenant_id = p.tenant_id
  where p.tenant_id = current_tenant_id()
    and p.is_published = true;
$$;

grant execute on function public.get_tenant_fan_page() to authenticated;

-- Admin RPC: create + seed a fan page row with starter blocks. Idempotent —
-- if a row already exists it returns the existing one untouched.
create or replace function public.gw_activate_fan_page()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := current_tenant_id();
  v_org text;
  v_logo text;
  v_tagline text;
  v_page gw_fan_pages;
begin
  if v_tenant is null then
    raise exception 'no tenant in session';
  end if;
  if not exists (
    select 1 from gw_profiles p
    where p.user_id = auth.uid()
      and (p.is_admin = true or p.is_super_admin = true
           or p.role in ('admin','super-admin','executive'))
  ) then
    raise exception 'admin required';
  end if;

  select b.org_name, b.logo_url, b.tagline into v_org, v_logo, v_tagline
    from gw_branding_settings b where b.tenant_id = v_tenant limit 1;

  insert into gw_fan_pages (tenant_id)
  values (v_tenant)
  on conflict (tenant_id) do nothing;

  select * into v_page from gw_fan_pages where tenant_id = v_tenant;

  if not exists (select 1 from gw_fan_page_blocks where tenant_id = v_tenant) then
    insert into gw_fan_page_blocks (tenant_id, block_type, position, config) values
      (v_tenant, 'header', 0, jsonb_build_object(
        'siteName', coalesce(v_org, 'Welcome, fans!'),
        'logoUrl', coalesce(v_logo, ''),
        'navLinks', jsonb_build_array(
          jsonb_build_object('label', 'Events', 'url', '#events'),
          jsonb_build_object('label', 'Listen', 'url', '#music'),
          jsonb_build_object('label', 'Watch', 'url', '#watch')))),
      (v_tenant, 'hero', 1, jsonb_build_object(
        'variant', 'image',
        'headline', 'Thanks for being a fan',
        'subheadline', coalesce(v_tagline, 'Concert announcements, behind-the-scenes news, and ways to support us.'),
        'ctaLabel', 'See upcoming events',
        'ctaUrl', '#events')),
      (v_tenant, 'events', 2, jsonb_build_object('style', 'month', 'limit', 12, 'heading', 'Upcoming events')),
      (v_tenant, 'music-player', 3, jsonb_build_object('heading', 'Listen', 'tracks', '[]'::jsonb)),
      (v_tenant, 'videos', 4, jsonb_build_object('heading', 'Watch', 'layout', 'grid', 'videos', '[]'::jsonb)),
      (v_tenant, 'support', 5, jsonb_build_object('heading', 'Support our program'));
  end if;

  return to_jsonb(v_page);
end;
$$;

grant execute on function public.gw_activate_fan_page() to authenticated;
