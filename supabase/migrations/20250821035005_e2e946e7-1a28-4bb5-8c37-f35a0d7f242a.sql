-- Insert profile for the authenticated user if it doesn't exist
INSERT INTO public.gw_profiles (user_id, email, full_name, role, is_super_admin)
VALUES (
  '4e6c2ec0-1f83-449a-a984-8920f6056ab5',
  'kpj64110@gmail.com', 
  'Kevin Johnson',
  'member',
  true
) ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;