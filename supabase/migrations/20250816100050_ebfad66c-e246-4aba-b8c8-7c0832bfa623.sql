-- Fix the get_user_modules function to use the correct table (gw_module_permissions)
CREATE OR REPLACE FUNCTION public.get_user_modules(p_user uuid)
RETURNS TABLE(
  module_key text,
  module_name text,
  category text,
  can_view boolean,
  can_manage boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    m.key as module_key,
    m.name as module_name,
    m.category,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.gw_profiles gp 
        WHERE gp.user_id = p_user AND (gp.is_admin = true OR gp.is_super_admin = true)
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.gw_module_permissions gmp
        WHERE gmp.user_id = p_user 
        AND gmp.module_id = m.id 
        AND gmp.permission_type = 'view'
        AND gmp.is_active = true
        AND (gmp.expires_at IS NULL OR gmp.expires_at > now())
      ) THEN true
      ELSE false
    END as can_view,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.gw_profiles gp 
        WHERE gp.user_id = p_user AND (gp.is_admin = true OR gp.is_super_admin = true)
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.gw_module_permissions gmp
        WHERE gmp.user_id = p_user 
        AND gmp.module_id = m.id 
        AND gmp.permission_type = 'manage'
        AND gmp.is_active = true
        AND (gmp.expires_at IS NULL OR gmp.expires_at > now())
      ) THEN true
      ELSE false
    END as can_manage
  FROM public.gw_modules m
  WHERE m.is_active = true
  ORDER BY m.category, m.name;
$$;