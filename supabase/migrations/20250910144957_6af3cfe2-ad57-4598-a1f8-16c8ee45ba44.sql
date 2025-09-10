-- Fix the auth provider issue and set password for direct login
-- Update the user's metadata to support email/password authentication
UPDATE auth.users 
SET 
  raw_app_meta_data = jsonb_build_object(
    'provider', 'email',
    'providers', '["email"]'
  ),
  encrypted_password = crypt('CafeKJ2025@', gen_salt('bf'))
WHERE email = 'kpj64110@gmail.com' AND id = '4e6c2ec0-1f83-449a-a984-8920f6056ab5';