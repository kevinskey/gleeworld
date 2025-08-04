-- Create a simpler bootstrap function that doesn't rely on disabling triggers
CREATE OR REPLACE FUNCTION public.simple_admin_bootstrap()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  user_email text;
BEGIN
  current_user_id := auth.uid();
  
  -- Get user email from auth.users
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = current_user_id;
  
  -- Use INSERT ... ON CONFLICT to handle both creation and update
  INSERT INTO public.gw_profiles (
    user_id, email, role, full_name, is_admin, is_super_admin, 
    created_at, updated_at
  )
  VALUES (
    current_user_id, 
    user_email,
    'admin', 
    'Admin User',
    true,
    true,
    now(),
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    is_admin = true,
    is_super_admin = true,
    role = 'admin',
    full_name = COALESCE(gw_profiles.full_name, 'Admin User'),
    updated_at = now();
  
  RETURN true;
END;
$function$

-- Update clean_admin_bootstrap to use the simpler function
CREATE OR REPLACE FUNCTION public.clean_admin_bootstrap()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.simple_admin_bootstrap();
END;
$function$