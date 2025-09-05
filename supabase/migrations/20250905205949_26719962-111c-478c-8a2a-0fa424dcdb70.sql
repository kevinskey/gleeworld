-- Grant first-year-console module access to crew manager role
-- First, check if the module permission exists
INSERT INTO public.gw_module_permissions (user_id, module_name, permission_type, is_active)
SELECT 
    p.user_id,
    'first-year-console' as module_name,
    'manage' as permission_type,
    true as is_active
FROM public.gw_profiles p 
WHERE p.role = 'crew-manager' OR p.exec_board_role = 'set_up_crew_manager'
ON CONFLICT (user_id, module_name, permission_type) 
DO UPDATE SET 
    is_active = true,
    updated_at = now();

-- Also add view permission
INSERT INTO public.gw_module_permissions (user_id, module_name, permission_type, is_active)
SELECT 
    p.user_id,
    'first-year-console' as module_name,
    'view' as permission_type,
    true as is_active
FROM public.gw_profiles p 
WHERE p.role = 'crew-manager' OR p.exec_board_role = 'set_up_crew_manager'
ON CONFLICT (user_id, module_name, permission_type) 
DO UPDATE SET 
    is_active = true,
    updated_at = now();