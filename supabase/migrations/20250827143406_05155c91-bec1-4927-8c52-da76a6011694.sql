-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_user_modules(UUID);

-- Create the correct function that returns empty results for now
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
  -- For now, return empty results since the permissions system isn't fully set up
  -- This ensures executive board members only get explicitly granted modules (which is none for now)
  SELECT 
    NULL::TEXT as module_key,
    NULL::TEXT as module_name,
    false as can_view,
    false as can_edit,
    false as can_manage
  WHERE false; -- Return no results
$$;