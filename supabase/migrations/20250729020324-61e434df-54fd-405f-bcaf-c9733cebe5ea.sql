-- Use the secure admin function to update user role
-- This bypasses the privilege escalation check since it's designed for admin use
SELECT public.secure_update_user_role(
  '2dacd89c-5673-41cd-92b9-469b03e94683'::uuid, 
  'super-admin', 
  'Granting access to executive board dashboard'
);