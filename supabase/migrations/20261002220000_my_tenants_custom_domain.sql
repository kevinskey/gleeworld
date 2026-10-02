-- my_tenants: hand back the tenant's custom domain too.
--
-- The account menu's "Switch organization" built its target URL as
-- https://<slug>.gleeworld.org, which is wrong for any tenant that lives on
-- its own domain. Yo-Doc's slug is `kevin`, so a member switching to Yo-Doc
-- landed on kevin.gleeworld.org instead of yo-doc.com — a domain they have
-- never been told about, which reads like the wrong site (Kevin, 2026-10-02).
--
-- Adding a column to the return table means DROP + CREATE; CREATE OR REPLACE
-- cannot change a function's signature. The frontend degrades to [] on error
-- (useMyTenants), so the brief window where the function is absent costs a
-- missing switcher, not a broken dashboard.
--
-- Everything else is unchanged from 20260719140000: SECURITY DEFINER to read
-- across gw_tenant_members' per-tenant RLS, scoped to auth.uid() in the body
-- so a caller only ever sees their own memberships, granted to authenticated
-- only — the switcher is membership-based and deliberately NOT role-gated.
drop function if exists public.my_tenants();

create or replace function public.my_tenants()
returns table (
  tenant_id uuid,
  slug text,
  name text,
  role text,
  custom_domain text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    tm.tenant_id,
    t.slug,
    t.name,
    coalesce(tm.role, '')::text as role,
    nullif(btrim(coalesce(t.custom_domain, '')), '') as custom_domain
  from gw_tenant_members tm
  join gw_tenants t on t.id = tm.tenant_id
  where tm.user_id = auth.uid()
  order by t.name nulls last, t.slug;
$$;

revoke all on function public.my_tenants() from public;
grant execute on function public.my_tenants() to authenticated;
