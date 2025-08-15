-- Drop existing function and recreate with correct signature
DROP FUNCTION IF EXISTS public.get_user_modules(UUID);

-- Create the correct function
CREATE OR REPLACE FUNCTION public.get_user_modules(p_user UUID)
RETURNS TABLE(module_key TEXT, module_name TEXT, category TEXT, can_view BOOLEAN, can_manage BOOLEAN)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH role_perms AS (
    SELECT 
      ur.user_id, 
      rmp.module_id,
      bool_or(rmp.can_view) as can_view,
      bool_or(rmp.can_manage) as can_manage
    FROM public.v_user_roles ur
    JOIN public.gw_role_module_permissions rmp ON rmp.role_id = ur.role_id
    WHERE ur.user_id = p_user
    GROUP BY ur.user_id, rmp.module_id
  ),
  merged AS (
    SELECT
      COALESCE(ump.user_id, rp.user_id) as user_id,
      COALESCE(ump.module_id, rp.module_id) as module_id,
      COALESCE(ump.can_view, rp.can_view, false) as can_view,
      COALESCE(ump.can_manage, rp.can_manage, false) as can_manage
    FROM role_perms rp
    FULL OUTER JOIN public.username_module_permissions ump
      ON rp.user_id = ump.user_id 
      AND rp.module_id = ump.module_id 
      AND ump.is_active = true
      AND (ump.expires_at IS NULL OR ump.expires_at > now())
  )
  SELECT 
    m.key as module_key, 
    m.name as module_name, 
    m.category,
    bool_or(e.can_view) as can_view, 
    bool_or(e.can_manage) as can_manage
  FROM merged e
  JOIN public.gw_modules m ON m.id = e.module_id
  WHERE m.is_active = true AND e.user_id = p_user
  GROUP BY m.key, m.name, m.category
  ORDER BY m.category, m.name;
$$;