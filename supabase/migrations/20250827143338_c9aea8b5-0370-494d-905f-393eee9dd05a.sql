-- Just create the function and ensure we have the necessary tables
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
  -- For now, return empty results since the permissions system isn't set up yet
  -- Executive board members should only get explicitly granted modules
  SELECT 
    ''::TEXT as module_key,
    ''::TEXT as module_name,
    false as can_view,
    false as can_edit,
    false as can_manage
  WHERE false; -- Return no results
$$;