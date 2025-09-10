-- Fix auth issue: Convert Google OAuth user to email/password
-- First, update the user's auth metadata to enable email/password auth
UPDATE auth.users 
SET 
  raw_app_meta_data = jsonb_build_object(
    'provider', 'email',
    'providers', '["email"]'
  ),
  encrypted_password = crypt('CafeKJ2025@', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email = 'kpj64110@gmail.com';

-- Also ensure the profile exists and is properly set as super admin
INSERT INTO public.gw_profiles (
  user_id,
  email,
  full_name,
  first_name,
  last_name,
  is_super_admin,
  is_admin,
  role,
  verified
) VALUES (
  '4e6c2ec0-1f83-449a-a984-8920f6056ab5',
  'kpj64110@gmail.com',
  'Kevin Phillip Johnson',
  'Kevin',
  'Johnson',
  true,
  true,
  'super-admin',
  true
) ON CONFLICT (user_id) DO UPDATE SET
  is_super_admin = true,
  is_admin = true,
  role = 'super-admin',
  verified = true;