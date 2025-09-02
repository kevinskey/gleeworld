-- Reset all users to be members and simplify permission system
-- This will make everyone a member and use exec board positions for special access

-- First, update all existing profiles to be members
UPDATE public.gw_profiles 
SET role = 'member', 
    is_admin = false,
    is_super_admin = false,
    updated_at = now()
WHERE role != 'member' OR is_admin = true OR is_super_admin = true;

-- Keep exec board members marked as exec board
UPDATE public.gw_profiles 
SET is_exec_board = true,
    updated_at = now()
WHERE user_id IN (
  SELECT user_id FROM public.gw_executive_board_members 
  WHERE is_active = true
);

-- Create a simple function to check if user is exec board or admin based on position
CREATE OR REPLACE FUNCTION public.current_user_can_access_admin_modules()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (role IN ('admin', 'super-admin') OR is_admin = true OR is_super_admin = true)
  );
$$;

-- Create function to check executive function access
CREATE OR REPLACE FUNCTION public.current_user_has_executive_function_access(
  function_name_param text,
  permission_type_param text DEFAULT 'can_access'
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.gw_executive_board_members ebm
    JOIN public.gw_executive_position_functions epf ON ebm.position = epf.position
    JOIN public.gw_app_functions af ON epf.function_id = af.id
    WHERE ebm.user_id = auth.uid() 
    AND ebm.is_active = true
    AND af.function_name = function_name_param
    AND (
      (permission_type_param = 'can_access' AND epf.can_access = true) OR
      (permission_type_param = 'can_manage' AND epf.can_manage = true)
    )
  ) OR EXISTS (
    -- Directors and admins have access to everything
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (role IN ('admin', 'super-admin', 'director') OR is_admin = true OR is_super_admin = true)
  );
$$;