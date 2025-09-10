-- Remove force password change requirement for super admin
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'force_password_change' - 'password_reset_by_admin' - 'password_reset_at'
WHERE email = 'kpj64110@gmail.com';

-- Also remove it for any other users if needed (optional - uncomment if you want to clear all)
-- UPDATE auth.users 
-- SET raw_user_meta_data = raw_user_meta_data - 'force_password_change' - 'password_reset_by_admin' - 'password_reset_at'
-- WHERE raw_user_meta_data->>'force_password_change' = 'true';