-- Create profiles for auth users that don't have them
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'user',
  au.created_at,
  now()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Create gw_profiles for auth users that don't have them
INSERT INTO public.gw_profiles (
  user_id, email, full_name, first_name, last_name, created_at, updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  au.raw_user_meta_data->>'first_name',
  au.raw_user_meta_data->>'last_name',
  au.created_at,
  now()
FROM auth.users au
LEFT JOIN gw_profiles gw ON au.id = gw.user_id
WHERE gw.id IS NULL;

-- For the 2 GW profiles without auth users, we'll need to handle them specially
-- since we can't create auth.users directly from SQL
-- Let's mark them as needing manual attention
UPDATE public.gw_profiles 
SET notes = COALESCE(notes || ' | ', '') || 'NEEDS AUTH ACCOUNT - Original Glee World user without system login'
WHERE user_id IS NULL;