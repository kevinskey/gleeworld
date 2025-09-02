-- Create a simple function to check if user is exec board member
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
    AND (role IN ('admin', 'super-admin', 'director') OR is_admin = true OR is_super_admin = true)
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

-- Update all users to member role (do this gradually to avoid trigger issues)
UPDATE public.gw_profiles 
SET role = 'member', updated_at = now()
WHERE role NOT IN ('member', 'director') 
AND NOT (is_admin = true OR is_super_admin = true);

-- Mark exec board members appropriately
UPDATE public.gw_profiles 
SET is_exec_board = true, updated_at = now()
WHERE user_id IN (
  SELECT user_id FROM public.gw_executive_board_members 
  WHERE is_active = true
) AND is_exec_board != true;