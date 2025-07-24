-- Sync the role from gw_profiles to profiles table
UPDATE public.profiles 
SET role = 'super-admin'
WHERE id = '4e6c2ec0-1f83-449a-a984-8920f6056ab5';

-- Also update any other users whose roles might be out of sync
UPDATE public.profiles p
SET role = gp.role
FROM public.gw_profiles gp
WHERE p.id = gp.user_id 
AND p.role != gp.role;