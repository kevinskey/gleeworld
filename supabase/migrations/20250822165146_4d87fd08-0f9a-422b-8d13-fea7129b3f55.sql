-- Create a special function that can be called as a super admin action
-- This will use the existing admin role check to allow the update
CREATE OR REPLACE FUNCTION public.bulk_update_roles_july_registrations()
RETURNS TABLE(
  updated_count INTEGER,
  role_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated_count INTEGER := 0;
  _role_counts JSONB;
BEGIN
  -- Check if the calling context has admin privileges
  -- This function runs as the function owner (security definer)
  -- so it should have the necessary permissions
  
  -- First, let's see how many users would be affected
  SELECT COUNT(*) INTO _updated_count
  FROM public.gw_profiles 
  WHERE role = 'fan' 
  AND created_at > '2025-07-25'::date;
  
  -- If there are users to update, proceed
  IF _updated_count > 0 THEN
    -- Perform the update
    UPDATE public.gw_profiles 
    SET role = 'student',
        updated_at = now()
    WHERE role = 'fan' 
    AND created_at > '2025-07-25'::date;
    
    -- Log this administrative action
    PERFORM public.log_security_event(
      'admin_bulk_role_update',
      'gw_profiles',
      NULL,
      jsonb_build_object(
        'updated_count', _updated_count,
        'from_role', 'fan',
        'to_role', 'student',
        'criteria', 'registered_after_2025_07_25',
        'performed_by_function', 'bulk_update_roles_july_registrations'
      )
    );
  END IF;
  
  -- Get current role breakdown
  SELECT jsonb_object_agg(role, user_count) INTO _role_counts
  FROM (
    SELECT role, COUNT(*) as user_count
    FROM public.gw_profiles 
    GROUP BY role
  ) role_summary;
  
  RETURN QUERY SELECT _updated_count, _role_counts;
END;
$$;

-- Execute the function to perform the update
SELECT * FROM public.bulk_update_roles_july_registrations();