-- Public fan signup block: anonymous visitors submit their email/name from the
-- public site; the row is filed under the tenant that owns the site. Admins
-- read these from the Control Center "Fans" view (out of scope for this
-- migration). RLS keeps tenants isolated; the anon insert path goes through
-- the gw_fan_signup_submit RPC (SECURITY DEFINER) which resolves the tenant
-- from the published site slug, so anon never touches the table directly.

create table if not exists public.gw_fan_signups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default current_tenant_id(),
  email text not null,
  name text,
  city text,
  source text default 'public-site',
  consent_marketing boolean default true,
  created_at timestamptz not null default now()
);

create unique index if not exists gw_fan_signups_tenant_email_idx
  on public.gw_fan_signups(tenant_id, lower(email));

alter table public.gw_fan_signups enable row level security;

-- Tenant isolation: only members of the same tenant can see signups. Insert
-- by authenticated users is allowed (in case the block runs in a logged-in
-- session); anon inserts go through the RPC.
drop policy if exists fan_signups_tenant_select on public.gw_fan_signups;
create policy fan_signups_tenant_select on public.gw_fan_signups
  as restrictive for select to authenticated, anon
  using (tenant_id = current_tenant_id());

drop policy if exists fan_signups_authed_insert on public.gw_fan_signups;
create policy fan_signups_authed_insert on public.gw_fan_signups
  for insert to authenticated
  with check (tenant_id = current_tenant_id());

drop policy if exists fan_signups_admin_modify on public.gw_fan_signups;
create policy fan_signups_admin_modify on public.gw_fan_signups
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

-- Anon-callable submission RPC. Resolves tenant from the published site
-- slug so anon never needs direct insert privileges. Idempotent on
-- (tenant, lower(email)) so refreshes don't duplicate.
create or replace function public.gw_fan_signup_submit(
  p_slug text,
  p_email text,
  p_name text default null,
  p_city text default null,
  p_consent boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_clean_email text := lower(trim(p_email));
begin
  if v_clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  select s.tenant_id into v_tenant
    from gw_public_sites s
   where s.slug = p_slug and s.is_published = true
   limit 1;

  if v_tenant is null then
    raise exception 'site not found or not published' using errcode = '42P01';
  end if;

  insert into gw_fan_signups (tenant_id, email, name, city, source, consent_marketing)
  values (
    v_tenant, v_clean_email,
    nullif(trim(coalesce(p_name, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    'public-site', coalesce(p_consent, true)
  )
  on conflict (tenant_id, lower(email)) do update
    set name = coalesce(excluded.name, gw_fan_signups.name),
        city = coalesce(excluded.city, gw_fan_signups.city);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.gw_fan_signup_submit(text, text, text, text, boolean) to anon, authenticated;
