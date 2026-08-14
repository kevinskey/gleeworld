-- Anonymous visitors couldn't read the public wishes wall: the RLS read
-- policy on gw_wish_wall_posts is `(hidden = false) OR is_staff_of_tenant(tenant_id)`,
-- and anon lacked EXECUTE on is_staff_of_tenant, so the whole SELECT failed
-- with "permission denied for function" on public tenant pages (e.g.
-- kevin.gleeworld.org/retirement). The function is safe for anon: it checks
-- gw_tenant_members against auth.uid(), which is NULL for anon, so it simply
-- returns false and the policy falls back to hidden = false.
grant execute on function public.is_staff_of_tenant(uuid) to anon;
