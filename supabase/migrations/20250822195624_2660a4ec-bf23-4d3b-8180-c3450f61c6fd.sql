-- Fix get_all_user_profiles to work with module access
DROP FUNCTION IF EXISTS public.get_all_user_profiles();

CREATE OR REPLACE FUNCTION public.get_all_user_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- For module access, we need to return all profiles for admins to manage
  -- The ModuleAccess component will handle the permission checking on the frontend
  SELECT 
    p.user_id as id, 
    p.email, 
    p.full_name, 
    p.role, 
    p.created_at
  FROM public.gw_profiles p
  WHERE p.user_id IS NOT NULL
  ORDER BY p.full_name NULLS LAST, p.email;
$$;