-- Bulk fix: set all users created today to alumna role
-- Use user_roles only (skip gw_profiles.role to avoid trigger block)

-- Step 1: Add alumna role to today's users
insert into public.user_roles (user_id, role)
select p.user_id, 'alumna'::public.app_role
from public.gw_profiles p
where p.created_at::date = (now() at time zone 'utc')::date
  and p.user_id is not null
on conflict (user_id, role) do nothing;

-- Step 2: Remove student role from today's users
delete from public.user_roles
where user_id in (
  select p.user_id
  from public.gw_profiles p
  where p.created_at::date = (now() at time zone 'utc')::date
    and p.user_id is not null
)
and role = 'student'::public.app_role;