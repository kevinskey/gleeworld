-- Update gw_profiles to match the profiles table for the user
UPDATE public.gw_profiles 
SET 
  role = 'super-admin',
  is_admin = true,
  is_super_admin = true,
  updated_at = now()
WHERE email = 'kpj64110@gmail.com' OR user_id = '4e6c2ec0-1f83-449a-a984-8920f6056ab5';