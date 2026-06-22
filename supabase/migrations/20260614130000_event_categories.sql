-- Tenant-scoped event categories. Replaces the hardcoded CATEGORY_CONFIGS
-- constant in the frontend so directors can add / rename / delete buckets
-- for their tenant from the Calendar Settings dialog.
--
-- ── MULTI-TENANT SAFETY ──────────────────────────────────────────────────
--   1. tenant_id column with DEFAULT public.current_tenant_id().
--   2. BEFORE INSERT trigger as defense in depth (per project memory —
--      defaults alone can silently write NULL when the connection has no
--      tenant claim).
--   3. RESTRICTIVE policy `tenant_id = current_tenant_id()` mirrors the
--      pattern used by gw_calendars and ~580 sibling tables.
--   4. Permissive policies layer on access rules — everyone in the tenant
--      can READ, only admins / super-admins can write.

create table if not exists public.gw_event_categories (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null default public.current_tenant_id(),
  slug        text not null,
  label       text not null,
  color       text not null default '#475569',
  icon        text not null default 'tag',
  position    int  not null default 100,
  is_default  boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index if not exists gw_event_categories_tenant_idx
  on public.gw_event_categories (tenant_id, position);

-- Defense-in-depth tenant_id enforcement.
create or replace function public.gw_event_categories_set_tenant_id()
returns trigger language plpgsql as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists gw_event_categories_tenant_id_trigger on public.gw_event_categories;
create trigger gw_event_categories_tenant_id_trigger
  before insert on public.gw_event_categories
  for each row execute function public.gw_event_categories_set_tenant_id();

-- updated_at autotouch
create or replace function public.gw_event_categories_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists gw_event_categories_touch_trigger on public.gw_event_categories;
create trigger gw_event_categories_touch_trigger
  before update on public.gw_event_categories
  for each row execute function public.gw_event_categories_touch_updated_at();

-- RLS
alter table public.gw_event_categories enable row level security;

-- Drop in case re-running.
drop policy if exists tenant_isolation_restrict on public.gw_event_categories;
drop policy if exists "Everyone can view categories"    on public.gw_event_categories;
drop policy if exists "Admins can write categories"     on public.gw_event_categories;

-- Restrictive: every row scoped to caller's tenant. Mirrors gw_calendars.
create policy tenant_isolation_restrict
  on public.gw_event_categories
  as restrictive
  for all
  using  (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Permissive read for any authenticated user in the tenant.
create policy "Everyone can view categories"
  on public.gw_event_categories
  for select
  to authenticated
  using (true);

-- Permissive write for admins / super-admins only.
create policy "Admins can write categories"
  on public.gw_event_categories
  for all
  to authenticated
  using (
    exists (
      select 1 from public.gw_profiles
      where user_id = auth.uid()
        and (is_admin = true or is_super_admin = true)
    )
  )
  with check (
    exists (
      select 1 from public.gw_profiles
      where user_id = auth.uid()
        and (is_admin = true or is_super_admin = true)
    )
  );

grant select, insert, update, delete on public.gw_event_categories to authenticated;

-- Seed the default category palette for every existing tenant. is_default=true
-- prevents accidental deletion of the built-ins from the settings dialog.
insert into public.gw_event_categories (tenant_id, slug, label, color, icon, position, is_default)
select t.id, s.slug, s.label, s.color, s.icon, s.position, true
  from public.gw_tenants t
  cross join (values
    ('glee',         'Glee Club',           '#0891b2', 'music',     10),
    ('courses',      'Courses',             '#ea580c', 'book-open', 20),
    ('academic',     'Assignments & Tests', '#d97706', 'clipboard', 30),
    ('liturgy',      'Liturgy',             '#9333ea', 'church',    40),
    ('performances', 'Performances',        '#e11d48', 'mic',       50),
    ('leadership',   'Leadership',          '#0d9488', 'users',     60),
    ('tour',         'Tour',                '#059669', 'plane',     70),
    ('personal',     'Personal',            '#475569', 'user',      80)
  ) as s(slug, label, color, icon, position)
on conflict (tenant_id, slug) do nothing;
