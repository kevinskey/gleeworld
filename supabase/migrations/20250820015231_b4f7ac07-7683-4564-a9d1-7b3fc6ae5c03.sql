-- Make the current authenticated user an admin
UPDATE public.gw_profiles 
SET is_admin = true, is_super_admin = true, role = 'admin' 
WHERE user_id = auth.uid();

-- If no profile exists, create one for the current user
INSERT INTO public.gw_profiles (user_id, email, full_name, role, is_admin, is_super_admin)
SELECT 
  auth.uid(), 
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  'Admin User',
  'admin',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid());