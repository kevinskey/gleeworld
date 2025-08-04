-- Bootstrap initial admin user
-- This migration allows initial admin setup by bypassing security triggers

-- Create a temporary function to bootstrap the first admin
CREATE OR REPLACE FUNCTION bootstrap_initial_admin(user_email_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update user to admin role, bypassing security triggers
  UPDATE public.profiles 
  SET role = 'admin', 
      full_name = COALESCE(full_name, split_part(user_email_param, '@', 1))
  WHERE email = user_email_param;
  
  -- If no profile exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, role, full_name)
    SELECT id, email, 'admin', split_part(user_email_param, '@', 1)
    FROM auth.users 
    WHERE email = user_email_param
    LIMIT 1;
  END IF;
  
  RETURN FOUND;
END;
$$;