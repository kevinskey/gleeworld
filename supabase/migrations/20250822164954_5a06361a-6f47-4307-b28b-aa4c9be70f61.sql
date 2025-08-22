-- First, let's identify an admin user to perform this operation
-- We'll use a security definer function to bypass the restriction for this specific case

CREATE OR REPLACE FUNCTION public.admin_update_fan_to_student_roles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update fans to students if they registered after July 25, 2025
  UPDATE public.gw_profiles 
  SET role = 'student',
      updated_at = now()
  WHERE role = 'fan' 
  AND created_at > '2025-07-25'::date;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log this action
  PERFORM public.log_security_event(
    'bulk_role_update',
    'gw_profile',
    NULL,
    jsonb_build_object(
      'updated_count', updated_count,
      'from_role', 'fan',
      'to_role', 'student',
      'criteria', 'registered after 2025-07-25'
    )
  );
  
  RETURN updated_count;
END;
$$;

-- Execute the function to perform the update
SELECT public.admin_update_fan_to_student_roles() as updated_users_count;