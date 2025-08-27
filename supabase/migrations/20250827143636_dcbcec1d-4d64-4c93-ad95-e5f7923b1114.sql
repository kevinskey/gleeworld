-- Update the get_user_modules function to read from the existing permissions table
CREATE OR REPLACE FUNCTION public.get_user_modules(p_user UUID)
RETURNS TABLE(
  module_key TEXT,
  module_name TEXT,
  can_view BOOLEAN,
  can_edit BOOLEAN,
  can_manage BOOLEAN
) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Read from the existing gw_user_module_permissions table
  SELECT 
    ump.module_id as module_key,
    ump.module_id as module_name,  -- Using module_id as name for now
    true as can_view,               -- Active permissions mean can view
    false as can_edit,              -- Default to false for safety
    false as can_manage             -- Default to false for safety
  FROM public.gw_user_module_permissions ump
  WHERE ump.user_id = p_user 
  AND ump.is_active = true
  AND (ump.revoked_at IS NULL);
$$;