-- Fix the admin bootstrap function to update gw_profiles instead of profiles
CREATE OR REPLACE FUNCTION public.clean_admin_bootstrap()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update existing gw_profile to admin
  UPDATE public.gw_profiles 
  SET is_admin = true,
      is_super_admin = true,
      role = 'admin',
      full_name = COALESCE(full_name, 'Admin User'),
      updated_at = now()
  WHERE user_id = auth.uid();
  
  -- If no gw_profile exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.gw_profiles (user_id, email, role, full_name, is_admin, is_super_admin)
    SELECT auth.uid(), 
           (SELECT email FROM auth.users WHERE id = auth.uid()),
           'admin', 
           'Admin User',
           true,
           true;
  END IF;
  
  RETURN true;
END;
$function$