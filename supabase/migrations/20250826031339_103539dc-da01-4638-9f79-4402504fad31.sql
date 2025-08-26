-- Fix Executive Board Permission System
-- The issue is that executive board members need proper access to modules

-- First, create a function that checks if a user has executive board access to a specific function
CREATE OR REPLACE FUNCTION public.user_has_executive_function_access(
  user_id_param UUID, 
  function_name_param TEXT, 
  permission_type_param TEXT DEFAULT 'can_access'
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_position TEXT;
  has_permission BOOLEAN := false;
BEGIN
  -- First check if user is admin/super admin (they have all access)
  IF EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = user_id_param 
    AND (is_admin = true OR is_super_admin = true)
  ) THEN
    RETURN true;
  END IF;

  -- Get user's executive board position
  SELECT position INTO user_position
  FROM public.gw_executive_board_members
  WHERE user_id = user_id_param AND is_active = true
  LIMIT 1;

  -- If not an executive board member, return false
  IF user_position IS NULL THEN
    RETURN false;
  END IF;

  -- Check if the position has access to the specific function
  SELECT 
    CASE 
      WHEN permission_type_param = 'can_access' THEN epf.can_access
      WHEN permission_type_param = 'can_manage' THEN epf.can_manage
      ELSE false
    END
  INTO has_permission
  FROM public.gw_executive_position_functions epf
  JOIN public.gw_app_functions af ON af.id = epf.function_id
  WHERE epf.position = user_position::executive_position
  AND af.name = function_name_param
  LIMIT 1;

  RETURN COALESCE(has_permission, false);
END;
$$;

-- Create a function to check current user's executive function access
CREATE OR REPLACE FUNCTION public.current_user_has_executive_function_access(
  function_name_param TEXT, 
  permission_type_param TEXT DEFAULT 'can_access'
) 
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.user_has_executive_function_access(auth.uid(), function_name_param, permission_type_param);
$$;

-- Create a function to check if current user can access any admin modules
CREATE OR REPLACE FUNCTION public.current_user_can_access_admin_modules()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- Super admin or admin access
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR EXISTS (
    -- Executive board member with any function access
    SELECT 1 FROM public.gw_executive_board_members ebm
    JOIN public.gw_executive_position_functions epf ON epf.position = ebm.position
    WHERE ebm.user_id = auth.uid() 
    AND ebm.is_active = true
    AND (epf.can_access = true OR epf.can_manage = true)
  );
$$;

-- Set up Kevin as an executive board member for testing
INSERT INTO public.gw_executive_board_members (
  user_id, 
  position, 
  academic_year,
  is_active,
  appointed_date,
  notes
) VALUES (
  '4e6c2ec0-1f83-449a-a984-8920f6056ab5',
  'tour_manager',
  '2024-2025',
  true,
  CURRENT_DATE,
  'Added for testing executive board permissions'
) ON CONFLICT (user_id, position) DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- Grant full access to all functions for tour manager position (for testing)
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage, assigned_by)
SELECT 
  'tour_manager'::executive_position,
  af.id,
  true,
  true,
  '4e6c2ec0-1f83-449a-a984-8920f6056ab5'
FROM public.gw_app_functions af
WHERE af.is_active = true
ON CONFLICT (position, function_id) DO UPDATE SET
  can_access = true,
  can_manage = true,
  updated_at = NOW();