-- Try using the existing secure function to grant admin access
-- First let's check what the current user's role is
SELECT secure_update_user_role(
  'b4eaed0e-6fe7-4060-90d9-2d96a604f404'::uuid, 
  'admin', 
  'Granting admin access for playlist management'
);