-- Check current user and grant admin access if needed
-- First, let's see what users exist
SELECT email, id FROM auth.users LIMIT 5;

-- If you need admin access, we can update your profile
-- (Replace 'your-email@example.com' with your actual email)
-- UPDATE gw_profiles 
-- SET is_admin = true, is_super_admin = true 
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');