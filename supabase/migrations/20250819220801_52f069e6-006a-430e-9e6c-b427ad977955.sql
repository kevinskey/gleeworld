-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_user_modules(uuid);

-- Create updated function that checks both module permissions and module assignments
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
  WITH user_profile AS (
    SELECT role, is_admin, is_super_admin, is_exec_board
    FROM public.gw_profiles
    WHERE user_id = p_user
    LIMIT 1
  ),
  
  -- Direct user permissions from gw_module_permissions
  direct_permissions AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      m.category,
      bool_or(gmp.permission_type = 'view' OR gmp.permission_type = 'manage') as can_view,
      bool_or(gmp.permission_type = 'manage') as can_manage
    FROM public.gw_modules m
    JOIN public.gw_module_permissions gmp ON gmp.module_id = m.id
    WHERE gmp.user_id = p_user 
    AND gmp.is_active = true
    AND (gmp.expires_at IS NULL OR gmp.expires_at > now())
    AND m.is_active = true
    GROUP BY m.key, m.name, m.category
  ),
  
  -- Individual assignments from gw_module_assignments
  individual_assignments AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      m.category,
      'view' = ANY(gma.permissions) OR 'manage' = ANY(gma.permissions) as can_view,
      'manage' = ANY(gma.permissions) as can_manage
    FROM public.gw_modules m
    JOIN public.gw_module_assignments gma ON gma.module_id = m.id
    WHERE gma.assigned_to_user_id = p_user
    AND gma.assignment_type = 'individual'
    AND gma.is_active = true
    AND (gma.expires_at IS NULL OR gma.expires_at > now())
    AND m.is_active = true
  ),
  
  -- Group assignments from gw_module_assignments
  group_assignments AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      m.category,
      'view' = ANY(gma.permissions) OR 'manage' = ANY(gma.permissions) as can_view,
      'manage' = ANY(gma.permissions) as can_manage
    FROM public.gw_modules m
    JOIN public.gw_module_assignments gma ON gma.module_id = m.id
    CROSS JOIN user_profile up
    WHERE gma.assignment_type = 'group'
    AND gma.is_active = true
    AND (gma.expires_at IS NULL OR gma.expires_at > now())
    AND m.is_active = true
    AND (
      gma.assigned_to_group = 'all' OR
      (gma.assigned_to_group = 'executive_board' AND up.is_exec_board = true) OR
      (gma.assigned_to_group = 'admin' AND (up.is_admin = true OR up.is_super_admin = true)) OR
      (gma.assigned_to_group = up.role)
    )
  ),
  
  -- Admin gets all modules
  admin_permissions AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      m.category,
      true as can_view,
      true as can_manage
    FROM public.gw_modules m
    CROSS JOIN user_profile up
    WHERE m.is_active = true
    AND (up.is_admin = true OR up.is_super_admin = true)
  ),
  
  -- Combine all permissions
  all_permissions AS (
    SELECT * FROM direct_permissions
    UNION ALL
    SELECT * FROM individual_assignments  
    UNION ALL
    SELECT * FROM group_assignments
    UNION ALL
    SELECT * FROM admin_permissions
  )
  
  SELECT 
    ap.module_key,
    ap.module_name,
    ap.category,
    bool_or(ap.can_view) as can_view,
    bool_or(ap.can_manage) as can_manage
  FROM all_permissions ap
  GROUP BY ap.module_key, ap.module_name, ap.category
  ORDER BY ap.category, ap.module_name;
$$;