-- Fix the admin bootstrap function to handle existing profiles without triggering security violation
CREATE OR REPLACE FUNCTION public.clean_admin_bootstrap()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  profile_exists boolean;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.gw_profiles WHERE user_id = current_user_id) INTO profile_exists;
  
  IF profile_exists THEN
    -- Delete existing profile to avoid trigger conflict
    DELETE FROM public.gw_profiles WHERE user_id = current_user_id;
  END IF;
  
  -- Create new admin profile
  INSERT INTO public.gw_profiles (user_id, email, role, full_name, is_admin, is_super_admin, created_at, updated_at)
  SELECT current_user_id, 
         (SELECT email FROM auth.users WHERE id = current_user_id),
         'admin', 
         'Admin User',
         true,
         true,
         now(),
         now();
  
  RETURN true;
END;
$function$