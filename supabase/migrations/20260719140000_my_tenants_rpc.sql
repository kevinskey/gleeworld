-- my_tenants: every tenant the current signed-in user belongs to.
--
-- The client uses this to populate the account menu's "Switch organization"
-- list. It's called on every dashboard load, so its absence has been
-- spewing a 404 + '[useMyTenants] query failed …schema cache' warning
-- into the console per navigation. The frontend already degrades to []
-- so the app works either way — this just makes the switcher populate
-- and quiets the console.
--
-- SECURITY DEFINER so it can read across gw_tenant_members' per-tenant
-- RLS. Scoped to auth.uid() inside the body so the caller only ever sees
-- their own memberships.

create or replace function public.my_tenants()
returns table (
  tenant_id uuid,
  slug text,
  name text,
  role text
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
    coalesce(tm.role, '')::text as role
  from gw_tenant_members tm
  join gw_tenants t on t.id = tm.tenant_id
  where tm.user_id = auth.uid()
  order by t.name nulls last, t.slug;
$$;

revoke all on function public.my_tenants() from public;
grant execute on function public.my_tenants() to authenticated;
