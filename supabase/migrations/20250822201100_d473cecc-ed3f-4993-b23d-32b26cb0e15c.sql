-- Update get_user_modules to treat exec board members as admins for module access
DROP FUNCTION IF EXISTS public.get_user_modules(uuid);

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
  -- Return empty result if p_user is null
  IF p_user IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH user_profile AS (
    SELECT p.user_id, p.role, p.is_admin, p.is_super_admin, p.is_exec_board
    FROM public.gw_profiles p
    WHERE p.user_id = p_user AND p.user_id IS NOT NULL
  ),
  -- Admin OR Executive Board gets all modules
  admin_or_exec_modules AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      true as can_view,
      true as can_manage,
      'admin' as source
    FROM public.gw_modules m
    CROSS JOIN user_profile up
    WHERE m.is_active = true
    AND (up.is_admin = true OR up.is_super_admin = true OR up.is_exec_board = true)
  ),
  -- Individual permissions (only for non-admin, non-exec users)
  individual_modules AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      bool_or(mp.permission_type = 'view' OR mp.permission_type = 'manage') as can_view,
      bool_or(mp.permission_type = 'manage') as can_manage,
      'individual' as source
    FROM public.gw_module_permissions mp
    JOIN public.gw_modules m ON m.id = mp.module_id
    CROSS JOIN user_profile up
    WHERE mp.user_id = p_user 
    AND mp.is_active = true
    AND (mp.expires_at IS NULL OR mp.expires_at > now())
    AND NOT (up.is_admin = true OR up.is_super_admin = true OR up.is_exec_board = true) -- Skip if admin or exec
    GROUP BY m.key, m.name
  ),
  -- Role-based permissions (only for non-admin, non-exec users)
  role_modules AS (
    SELECT 
      rmp.module_name as module_key,
      rmp.module_name,
      bool_or(rmp.permission_type = 'view' OR rmp.permission_type = 'manage') as can_view,
      bool_or(rmp.permission_type = 'manage') as can_manage,
      'role' as source
    FROM public.gw_role_module_permissions rmp
    CROSS JOIN user_profile up
    WHERE rmp.role = up.role 
    AND rmp.is_active = true
    AND (rmp.expires_at IS NULL OR rmp.expires_at > now())
    AND NOT (up.is_admin = true OR up.is_super_admin = true OR up.is_exec_board = true) -- Skip if admin or exec
    GROUP BY rmp.module_name
  )
  
  -- Combine all permissions
  SELECT a.module_key, a.module_name, a.can_view, a.can_manage, a.source FROM admin_or_exec_modules a
  UNION ALL
  SELECT i.module_key, i.module_name, i.can_view, i.can_manage, i.source FROM individual_modules i
  UNION ALL  
  SELECT r.module_key, r.module_name, r.can_view, r.can_manage, r.source FROM role_modules r;
END;
$$;