-- Public landing-page builder (2026-06-13)
-- Each tenant composes a public site from stacked blocks. Draft blocks live in
-- gw_site_blocks (admin-only, tenant-scoped); publishing snapshots them into
-- gw_public_sites.published_blocks. Anonymous visitors read ONLY the published
-- snapshot through security-definer RPCs — gw_site_blocks has no anon policy.
-- Additive + idempotent.

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.gw_public_sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique default current_tenant_id()
    references public.gw_tenants(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  theme jsonb not null default '{}'::jsonb,
  published_blocks jsonb,
  published_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gw_site_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default current_tenant_id()
    references public.gw_tenants(id) on delete cascade,
  block_type text not null,
  position int not null default 0,
  config jsonb not null default '{}'::jsonb,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_gw_site_blocks_tenant_pos
  on public.gw_site_blocks(tenant_id, position);

drop trigger if exists update_gw_public_sites_updated_at on public.gw_public_sites;
create trigger update_gw_public_sites_updated_at
  before update on public.gw_public_sites
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_gw_site_blocks_updated_at on public.gw_site_blocks;
create trigger update_gw_site_blocks_updated_at
  before update on public.gw_site_blocks
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_set_tenant_id on public.gw_public_sites;
create trigger trg_set_tenant_id
  before insert on public.gw_public_sites
  for each row execute function public.set_tenant_id_default();

drop trigger if exists trg_set_tenant_id on public.gw_site_blocks;
create trigger trg_set_tenant_id
  before insert on public.gw_site_blocks
  for each row execute function public.set_tenant_id_default();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.gw_public_sites enable row level security;
alter table public.gw_site_blocks enable row level security;

-- Tenant isolation (restrictive) — same shape as the platform-wide pattern.
drop policy if exists tenant_isolation_restrict on public.gw_public_sites;
create policy tenant_isolation_restrict on public.gw_public_sites
  as restrictive for all to authenticated
  using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

drop policy if exists tenant_isolation_restrict on public.gw_site_blocks;
create policy tenant_isolation_restrict on public.gw_site_blocks
  as restrictive for all to authenticated
  using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- Admins manage their own tenant's site + blocks.
drop policy if exists "Admins manage public site" on public.gw_public_sites;
create policy "Admins manage public site" on public.gw_public_sites
  for all to authenticated
  using (exists (
    select 1 from public.gw_profiles p
    where p.user_id = auth.uid()
      and (p.is_admin = true or p.is_super_admin = true or p.role in ('admin','super-admin','executive'))
  ))
  with check (exists (
    select 1 from public.gw_profiles p
    where p.user_id = auth.uid()
      and (p.is_admin = true or p.is_super_admin = true or p.role in ('admin','super-admin','executive'))
  ));

drop policy if exists "Admins manage site blocks" on public.gw_site_blocks;
create policy "Admins manage site blocks" on public.gw_site_blocks
  for all to authenticated
  using (exists (
    select 1 from public.gw_profiles p
    where p.user_id = auth.uid()
      and (p.is_admin = true or p.is_super_admin = true or p.role in ('admin','super-admin','executive'))
  ))
  with check (exists (
    select 1 from public.gw_profiles p
    where p.user_id = auth.uid()
      and (p.is_admin = true or p.is_super_admin = true or p.role in ('admin','super-admin','executive'))
  ));

-- No anon policies: anonymous access goes through the RPCs below only.

-- ── Public read RPCs (security definer) ─────────────────────────────────────

-- Published site by slug. Returns null when missing or unpublished.
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

-- Upcoming public events for a published site.
create or replace function public.get_public_site_events(p_slug text, p_limit int default 8)
returns table (id uuid, title text, description text, start_date timestamptz,
               end_date timestamptz, location text, image_url text)
language sql stable security definer
set search_path = public
as $$
  select e.id, e.title, e.description, e.start_date, e.end_date, e.location, e.image_url
  from gw_events e
  join gw_public_sites s on s.tenant_id = e.tenant_id
  where s.slug = p_slug and s.is_published = true
    and e.is_public = true and e.status = 'published'
    and e.start_date >= now()
  order by e.start_date asc
  limit greatest(1, least(coalesce(p_limit, 8), 24));
$$;

-- Slug availability for the editor (cross-tenant check the caller's RLS can't do).
create or replace function public.public_site_slug_available(p_slug text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select not exists (
    select 1 from gw_public_sites
    where slug = p_slug and tenant_id is distinct from current_tenant_id()
  );
$$;

-- ── Activation / seed ───────────────────────────────────────────────────────

-- First-time activation: creates the site row + Header/Hero/Events starter
-- blocks from existing tenant branding. Idempotent; returns the site row.
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
        'navLinks', '[]'::jsonb)),
      (v_tenant, 'hero', 1, jsonb_build_object(
        'variant', 'image',
        'headline', 'Welcome to ' || coalesce(v_org, v_slug),
        'subheadline', coalesce(v_tagline, ''))),
      (v_tenant, 'events', 2, jsonb_build_object('style', 'cards', 'limit', 4));
  end if;

  return to_jsonb(v_site);
end;
$$;

revoke all on function public.get_public_site(text) from public;
revoke all on function public.get_public_site_events(text, int) from public;
revoke all on function public.public_site_slug_available(text) from public;
revoke all on function public.gw_activate_public_site() from public;
grant execute on function public.get_public_site(text) to anon, authenticated;
grant execute on function public.get_public_site_events(text, int) to anon, authenticated;
grant execute on function public.public_site_slug_available(text) to authenticated;
grant execute on function public.gw_activate_public_site() to authenticated;
