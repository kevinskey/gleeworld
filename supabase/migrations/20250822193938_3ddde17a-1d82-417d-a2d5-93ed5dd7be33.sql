-- Drop the existing function and recreate it with the correct signature
DROP FUNCTION IF EXISTS public.get_user_modules(uuid);

-- Create the function with the correct return type
CREATE OR REPLACE FUNCTION public.get_user_modules(p_user uuid)
RETURNS TABLE (
  module_key text,
  module_name text,
  can_view boolean,
  can_manage boolean,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    SELECT p.user_id, p.role, p.is_admin, p.is_super_admin, p.is_exec_board
    FROM public.gw_profiles p
    WHERE p.user_id = p_user
  ),
  exec_position AS (
    SELECT e.position
    FROM public.gw_executive_board_members e
    WHERE e.user_id = p_user AND e.is_active = true
    LIMIT 1
  ),
  -- Role-based permissions
  role_permissions AS (
    SELECT 
      rmp.module_name as module_key,
      rmp.module_name,
      bool_or(rmp.permission_type = 'view') as can_view,
      bool_or(rmp.permission_type = 'manage') as can_manage,
      'role' as source
    FROM public.gw_role_module_permissions rmp
    CROSS JOIN user_profile up
    WHERE rmp.role = up.role 
    AND rmp.is_active = true
    AND (rmp.expires_at IS NULL OR rmp.expires_at > now())
    GROUP BY rmp.module_name
  ),
  -- Individual permissions  
  individual_permissions AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      bool_or(mp.permission_type = 'view') as can_view,
      bool_or(mp.permission_type = 'manage') as can_manage,
      'individual' as source
    FROM public.gw_module_permissions mp
    JOIN public.gw_modules m ON m.id = mp.module_id
    WHERE mp.user_id = p_user 
    AND mp.is_active = true
    AND (mp.expires_at IS NULL OR mp.expires_at > now())
    GROUP BY m.key, m.name
  ),
  -- Admin override
  admin_permissions AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      true as can_view,
      true as can_manage,
      'admin' as source
    FROM public.gw_modules m
    CROSS JOIN user_profile up
    WHERE m.is_active = true
    AND (up.is_admin = true OR up.is_super_admin = true)
  )
  
  -- Combine all permissions with priority: admin > individual > role
  SELECT 
    COALESCE(a.module_key, i.module_key, r.module_key) as module_key,
    COALESCE(a.module_name, i.module_name, r.module_name) as module_name,
    COALESCE(a.can_view, i.can_view, r.can_view, false) as can_view,
    COALESCE(a.can_manage, i.can_manage, r.can_manage, false) as can_manage,
    COALESCE(a.source, i.source, r.source, 'none') as source
  FROM admin_permissions a
  FULL OUTER JOIN individual_permissions i ON a.module_key = i.module_key
  FULL OUTER JOIN role_permissions r ON COALESCE(a.module_key, i.module_key) = r.module_key
  WHERE COALESCE(a.can_view, i.can_view, r.can_view, false) = true;
END;
$$;