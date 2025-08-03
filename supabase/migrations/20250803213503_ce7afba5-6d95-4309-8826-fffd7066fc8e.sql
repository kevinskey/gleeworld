-- Grant admin access to enable playlist management
-- Update the first user to have admin privileges for testing
UPDATE gw_profiles 
SET is_admin = true, is_super_admin = true 
WHERE user_id = 'b4eaed0e-6fe7-4060-90d9-2d96a604f404';