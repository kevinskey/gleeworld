-- Fix the get_user_modules function to return proper JSON format
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
    true as can_view,    -- Super admins have full access
    true as can_manage   -- Super admins have full access
  FROM gw_modules m
  WHERE m.is_active = true
  AND EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = p_user 
    AND (p.is_super_admin = true OR p.is_admin = true)
  )
  
  UNION ALL
  
  SELECT 
    m.key as module_key,
    m.name as module_name,
    m.category,
    CASE 
      WHEN mp.permission_type = 'manage' THEN true
      WHEN mp.permission_type = 'view' THEN true
      ELSE false
    END as can_view,
    CASE 
      WHEN mp.permission_type = 'manage' THEN true
      ELSE false
    END as can_manage
  FROM gw_modules m
  INNER JOIN gw_module_permissions mp ON mp.module_id = m.id
  WHERE m.is_active = true
  AND mp.user_id = p_user
  AND mp.is_active = true
  AND (mp.expires_at IS NULL OR mp.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = p_user 
    AND (p.is_super_admin = true OR p.is_admin = true)
  );
$$;