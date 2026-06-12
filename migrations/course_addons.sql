-- Premium Course Add-ons: template courses, products, entitlements, adopt/grant.
-- Idempotent. Run as supabase_admin (DB objects are owned by supabase_admin, not postgres).

-- ============ Academy course content tables ============
-- tenant_id NULL + is_template=true = global template (the sellable product content).
-- Adopt deep-copies a template into the tenant workspace with template_source_id stamped.

create table if not exists public.gw_academy_courses (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid references public.gw_tenants(id) default public.current_tenant_id(),
  is_template        boolean not null default false,
  template_source_id uuid references public.gw_academy_courses(id),
  slug               text,
  title              text not null,
  level              text,
  grades             text,
  description        text,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index if not exists gw_academy_courses_template_slug
  on public.gw_academy_courses (slug) where is_template;
create index if not exists gw_academy_courses_tenant on public.gw_academy_courses (tenant_id);

create table if not exists public.gw_academy_units (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.gw_academy_courses(id) on delete cascade,
  tenant_id   uuid references public.gw_tenants(id) default public.current_tenant_id(),
  is_template boolean not null default false,
  sort_order  int not null default 0,
  title       text not null
);
create index if not exists gw_academy_units_course on public.gw_academy_units (course_id);
create index if not exists gw_academy_units_tenant on public.gw_academy_units (tenant_id);

create table if not exists public.gw_academy_lessons (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid not null references public.gw_academy_units(id) on delete cascade,
  tenant_id   uuid references public.gw_tenants(id) default public.current_tenant_id(),
  is_template boolean not null default false,
  sort_order  int not null default 0,
  title       text not null,
  objectives  jsonb not null default '[]',
  content     text,
  listening   jsonb not null default '[]'
);
create index if not exists gw_academy_lessons_unit on public.gw_academy_lessons (unit_id);
create index if not exists gw_academy_lessons_tenant on public.gw_academy_lessons (tenant_id);

create table if not exists public.gw_academy_exercises (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.gw_academy_lessons(id) on delete cascade,
  tenant_id   uuid references public.gw_tenants(id) default public.current_tenant_id(),
  is_template boolean not null default false,
  sort_order  int not null default 0,
  type        text not null,
  data        jsonb not null default '{}'
);
create index if not exists gw_academy_exercises_lesson on public.gw_academy_exercises (lesson_id);
create index if not exists gw_academy_exercises_tenant on public.gw_academy_exercises (tenant_id);

-- ============ Products + entitlements ============

create table if not exists public.gw_course_product (
  id                 uuid primary key default gen_random_uuid(),
  template_course_id uuid references public.gw_academy_courses(id), -- null for bundles
  sku                text not null unique,
  name               text not null,
  level              text,
  price_cents        int not null,
  stripe_price_id    text,
  bundle_key         text,
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

create table if not exists public.gw_tenant_entitlement (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.gw_tenants(id),
  product_id            uuid not null references public.gw_course_product(id),
  source                text not null default 'purchase' check (source in ('purchase','grant','bundle')),
  stripe_payment_intent text,
  granted_at            timestamptz not null default now(),
  unique (tenant_id, product_id)
);
create index if not exists gw_tenant_entitlement_tenant on public.gw_tenant_entitlement (tenant_id);

-- ============ tenant_id write-path (same pattern as all tenant-scoped tables) ============

do $$
declare t text;
begin
  foreach t in array array['gw_academy_courses','gw_academy_units','gw_academy_lessons','gw_academy_exercises']
  loop
    execute format('drop trigger if exists trg_set_tenant_id on public.%I', t);
    execute format('create trigger trg_set_tenant_id before insert on public.%I
                    for each row execute function public.set_tenant_id_default()', t);
  end loop;
end $$;

-- ============ RLS ============
-- Restrictive layer: rows visible if they belong to the tenant OR are global templates.
-- Writes only into the caller's tenant (templates are service-role/owner only).

do $$
declare t text;
begin
  foreach t in array array['gw_academy_courses','gw_academy_units','gw_academy_lessons','gw_academy_exercises']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_or_template_restrict on public.%I', t);
    execute format('create policy tenant_or_template_restrict on public.%I
      as restrictive for all to authenticated
      using (tenant_id = public.current_tenant_id() or (is_template and tenant_id is null))
      with check (tenant_id = public.current_tenant_id())', t);
    execute format('drop policy if exists academy_select on public.%I', t);
    execute format('create policy academy_select on public.%I
      for select to authenticated using (true)', t);
    execute format('drop policy if exists academy_admin_write on public.%I', t);
    execute format('create policy academy_admin_write on public.%I
      for all to authenticated
      using (tenant_id = public.current_tenant_id()
             and coalesce(auth.jwt()->>''tenant_role'','''') in (''admin'',''super_admin''))
      with check (tenant_id = public.current_tenant_id()
             and coalesce(auth.jwt()->>''tenant_role'','''') in (''admin'',''super_admin''))', t);
  end loop;
end $$;

alter table public.gw_course_product enable row level security;
drop policy if exists product_select on public.gw_course_product;
create policy product_select on public.gw_course_product
  for select to authenticated using (active);

alter table public.gw_tenant_entitlement enable row level security;
drop policy if exists entitlement_select on public.gw_tenant_entitlement;
create policy entitlement_select on public.gw_tenant_entitlement
  for select to authenticated using (tenant_id = public.current_tenant_id());

-- ============ Adopt: deep copy a template course into the caller's tenant ============

create or replace function public.adopt_template_course(p_template_course_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_role text := coalesce(auth.jwt()->>'tenant_role','');
  v_new_course uuid;
  u record;
  l record;
  v_new_unit uuid;
  v_new_lesson uuid;
begin
  if v_tenant is null then
    raise exception 'No tenant context';
  end if;
  if v_role not in ('admin','super_admin') then
    raise exception 'Only tenant admins can adopt courses';
  end if;
  -- Entitlement only enforced once the course is actually sellable (has a Stripe price).
  if exists (
    select 1 from gw_course_product p
    where p.template_course_id = p_template_course_id
      and p.active and p.stripe_price_id is not null
  ) and not exists (
    select 1 from gw_tenant_entitlement e
    join gw_course_product p on p.id = e.product_id
    where e.tenant_id = v_tenant and p.template_course_id = p_template_course_id
  ) then
    raise exception 'Course not purchased';
  end if;

  insert into gw_academy_courses (tenant_id, is_template, template_source_id, slug, title, level, grades, description, created_by)
  select v_tenant, false, c.id, c.slug, c.title, c.level, c.grades, c.description, auth.uid()
  from gw_academy_courses c
  where c.id = p_template_course_id and c.is_template
  returning id into v_new_course;
  if v_new_course is null then
    raise exception 'Template course not found';
  end if;

  for u in select * from gw_academy_units where course_id = p_template_course_id order by sort_order loop
    insert into gw_academy_units (course_id, tenant_id, is_template, sort_order, title)
    values (v_new_course, v_tenant, false, u.sort_order, u.title)
    returning id into v_new_unit;
    for l in select * from gw_academy_lessons where unit_id = u.id order by sort_order loop
      insert into gw_academy_lessons (unit_id, tenant_id, is_template, sort_order, title, objectives, content, listening)
      values (v_new_unit, v_tenant, false, l.sort_order, l.title, l.objectives, l.content, l.listening)
      returning id into v_new_lesson;
      insert into gw_academy_exercises (lesson_id, tenant_id, is_template, sort_order, type, data)
      select v_new_lesson, v_tenant, false, e.sort_order, e.type, e.data
      from gw_academy_exercises e where e.lesson_id = l.id;
    end loop;
  end loop;

  return v_new_course;
end $$;
revoke all on function public.adopt_template_course(uuid) from anon;
grant execute on function public.adopt_template_course(uuid) to authenticated;

-- ============ Super-admin grant (comp a course to a tenant) ============

create or replace function public.grant_course_entitlement(p_tenant_id uuid, p_sku text)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_prod record;
  v_count int := 0;
begin
  if not exists (
    select 1 from gw_profiles where (user_id = auth.uid() or id = auth.uid()) and is_super_admin
  ) then
    raise exception 'Super-admin only';
  end if;

  select * into v_prod from gw_course_product where sku = p_sku and active;
  if v_prod is null then
    raise exception 'Unknown SKU %', p_sku;
  end if;

  if v_prod.template_course_id is null and v_prod.bundle_key is not null then
    insert into gw_tenant_entitlement (tenant_id, product_id, source)
    select p_tenant_id, p.id, 'grant'
    from gw_course_product p
    where p.bundle_key = v_prod.bundle_key and p.template_course_id is not null and p.active
    on conflict (tenant_id, product_id) do nothing;
    get diagnostics v_count = row_count;
  else
    insert into gw_tenant_entitlement (tenant_id, product_id, source)
    values (p_tenant_id, v_prod.id, 'grant')
    on conflict (tenant_id, product_id) do nothing;
    get diagnostics v_count = row_count;
  end if;
  return v_count;
end $$;
revoke all on function public.grant_course_entitlement(uuid, text) from anon;
grant execute on function public.grant_course_entitlement(uuid, text) to authenticated;

-- ============ Feature flag ============

insert into public.gw_feature_flags (flag_key, is_enabled, description)
values ('COURSE_STORE', true, 'Premium course add-ons in control-center + academy course library')
on conflict (flag_key) do nothing;
