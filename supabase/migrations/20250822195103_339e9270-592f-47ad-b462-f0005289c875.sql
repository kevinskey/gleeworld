-- Fix the get_all_user_profiles function
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
  SELECT 
    p.user_id as id, 
    p.email, 
    p.full_name, 
    p.role, 
    p.created_at
  FROM public.gw_profiles p
  WHERE p.user_id IS NOT NULL
  AND (
    -- Allow if current user is admin/super admin
    EXISTS(SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true))
  )
  ORDER BY p.full_name NULLS LAST, p.email;
$$;