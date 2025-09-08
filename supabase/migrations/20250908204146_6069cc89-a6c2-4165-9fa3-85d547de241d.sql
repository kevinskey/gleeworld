-- Direct promotion using service role privileges
-- This bypasses RLS since it's executed as a superuser
BEGIN;

-- Update the user profile directly
UPDATE public.gw_profiles 
SET 
  is_super_admin = true,
  is_admin = true,
  role = 'super-admin',
  verified = true,
  updated_at = now()
WHERE email = 'autumnbrooks@spelman.edu';

-- Verify the update was successful
DO $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT email, role, is_admin, is_super_admin, verified 
  INTO user_record
  FROM public.gw_profiles 
  WHERE email = 'autumnbrooks@spelman.edu';
  
  IF user_record.is_super_admin = true THEN
    RAISE NOTICE 'SUCCESS: % has been promoted to super admin', user_record.email;
  ELSE
    RAISE EXCEPTION 'FAILED: User promotion was not successful';
  END IF;
END $$;

COMMIT;