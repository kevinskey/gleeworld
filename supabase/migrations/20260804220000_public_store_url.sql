-- Public sites need to link visitors to the tenant's white-label T-Shirt
-- Brothers storefront (provisioned by the provision-tsb-store edge function,
-- recorded on gw_tenants.tsb_store_slug / tsb_store_subdomain).
--
-- A dedicated RPC rather than another field on get_public_site: the storefront
-- link is wanted by individual blocks, and get_public_site / SiteRenderContext
-- are shared surfaces under active edit. This keeps the change to one new
-- function plus the block that calls it.
--
-- URL shape mirrors FundraisingStoreSection.tsx, which is what tenant admins
-- already see in Workspace Settings — the two must not drift.
create or replace function public.gw_public_store_url(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'url',
    case
      when nullif(trim(coalesce(t.tsb_store_subdomain, '')), '') is not null
        then 'https://' || trim(t.tsb_store_subdomain) || '.tshirtbrothers.com'
      when nullif(trim(coalesce(t.tsb_store_slug, '')), '') is not null
        then 'https://tshirtbrothers.com/stores/' || trim(t.tsb_store_slug)
      else null
    end)
    from gw_public_sites s
    join gw_tenants t on t.id = s.tenant_id
   where s.slug = p_slug
     and s.is_published = true
   limit 1;
$$;

grant execute on function public.gw_public_store_url(text) to anon, authenticated;
