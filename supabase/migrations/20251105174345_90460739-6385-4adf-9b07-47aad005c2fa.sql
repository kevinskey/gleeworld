begin;

-- Copy module assignments including granted_by to satisfy NOT NULL constraint
insert into public.gw_user_module_permissions (user_id, module_id, granted_by, is_active)
select '0e5a07bc-cdd8-4eff-aaa0-fe9af1953e1a'::uuid,
       p.module_id,
       coalesce(p.granted_by, '6f14998d-a7ba-47f2-a331-5bc44445ec98'::uuid),
       coalesce(p.is_active, true)
from public.gw_user_module_permissions p
where p.user_id = '6f14998d-a7ba-47f2-a331-5bc44445ec98'::uuid
  and coalesce(p.is_active, true) = true
  and not exists (
    select 1 from public.gw_user_module_permissions x
    where x.user_id = '0e5a07bc-cdd8-4eff-aaa0-fe9af1953e1a'::uuid
      and x.module_id = p.module_id
      and coalesce(x.is_active, true) = true
  );

commit;