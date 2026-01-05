-- Now migrate all users with 'member' role to 'student' role in gw_profiles
UPDATE public.gw_profiles 
SET role = 'student', updated_at = now() 
WHERE role = 'member';