-- Grant executive board members proper permissions for core modules like events and communications
-- First, ensure there are specific permissions for executive role

-- Insert/Update permissions for executive board members to manage events
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, granted_by, granted_at, is_active)
VALUES 
  ('executive', 'events', 'view', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', NOW(), true),
  ('executive', 'events', 'manage', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', NOW(), true),
  ('executive', 'communications', 'view', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', NOW(), true),
  ('executive', 'communications', 'manage', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', NOW(), true),
  ('executive', 'calendar-management', 'view', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', NOW(), true),
  ('executive', 'calendar-management', 'manage', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', NOW(), true),
  ('executive', 'email-management', 'view', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', NOW(), true),
  ('executive', 'email-management', 'manage', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', NOW(), true)
ON CONFLICT (role, module_name, permission_type) 
DO UPDATE SET 
  is_active = true,
  updated_at = NOW();

-- Update the get_user_modules function to properly handle executive board member permissions
CREATE OR REPLACE FUNCTION public.get_user_modules(p_user uuid)
RETURNS TABLE (
  module_key text,
  module_name text,
  can_view boolean,
  can_manage boolean,
  can_edit boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_profile RECORD;
  is_exec_member BOOLEAN := false;
BEGIN
  -- Get user profile
  SELECT role, is_admin, is_super_admin, is_exec_board
  INTO user_profile
  FROM public.gw_profiles
  WHERE user_id = p_user;
  
  -- Check if user is executive board member
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = p_user AND is_active = true
  ) INTO is_exec_member;
  
  -- If super admin, return all modules with full permissions
  IF user_profile.is_super_admin OR user_profile.role = 'super-admin' THEN
    RETURN QUERY
    SELECT 
      m.key,
      m.name,
      true::boolean,
      true::boolean,
      true::boolean
    FROM public.gw_modules m
    WHERE m.is_active = true;
    RETURN;
  END IF;
  
  -- If admin, return most modules with manage permissions
  IF user_profile.is_admin OR user_profile.role = 'admin' THEN
    RETURN QUERY
    SELECT 
      m.key,
      m.name,
      true::boolean,
      true::boolean,
      true::boolean
    FROM public.gw_modules m
    WHERE m.is_active = true;
    RETURN;
  END IF;
  
  -- For executive board members, combine role permissions and executive permissions
  IF is_exec_member THEN
    RETURN QUERY
    SELECT DISTINCT
      COALESCE(m.key, rmp.module_name) as module_key,
      COALESCE(m.name, rmp.module_name) as module_name,
      bool_or(CASE WHEN rmp.permission_type = 'view' THEN true ELSE false END) as can_view,
      bool_or(CASE WHEN rmp.permission_type = 'manage' THEN true ELSE false END) as can_manage,
      bool_or(CASE WHEN rmp.permission_type = 'manage' THEN true ELSE false END) as can_edit
    FROM public.gw_role_module_permissions rmp
    LEFT JOIN public.gw_modules m ON m.name = rmp.module_name OR m.key = rmp.module_name
    WHERE rmp.role IN ('member', 'executive')
      AND rmp.is_active = true
      AND (rmp.expires_at IS NULL OR rmp.expires_at > NOW())
    GROUP BY COALESCE(m.key, rmp.module_name), COALESCE(m.name, rmp.module_name);
    RETURN;
  END IF;
  
  -- For regular members, return member role permissions only
  RETURN QUERY
  SELECT DISTINCT
    COALESCE(m.key, rmp.module_name) as module_key,
    COALESCE(m.name, rmp.module_name) as module_name,
    bool_or(CASE WHEN rmp.permission_type = 'view' THEN true ELSE false END) as can_view,
    bool_or(CASE WHEN rmp.permission_type = 'manage' THEN true ELSE false END) as can_manage,
    bool_or(CASE WHEN rmp.permission_type = 'manage' THEN true ELSE false END) as can_edit
  FROM public.gw_role_module_permissions rmp
  LEFT JOIN public.gw_modules m ON m.name = rmp.module_name OR m.key = rmp.module_name
  WHERE rmp.role = 'member'
    AND rmp.is_active = true
    AND (rmp.expires_at IS NULL OR rmp.expires_at > NOW())
  GROUP BY COALESCE(m.key, rmp.module_name), COALESCE(m.name, rmp.module_name);
END;
$$;