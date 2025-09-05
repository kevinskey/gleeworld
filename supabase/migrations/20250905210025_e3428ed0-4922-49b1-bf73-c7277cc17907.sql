-- Grant first-year-console module access to crew manager role using the correct table structure
-- Add role-based permissions for crew managers
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active, granted_by)
VALUES 
    ('crew-manager', 'first-year-console', 'view', true, (SELECT id FROM auth.users LIMIT 1)),
    ('crew-manager', 'first-year-console', 'manage', true, (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (role, module_name, permission_type) 
DO UPDATE SET 
    is_active = true,
    updated_at = now();

-- Also grant access to users with set_up_crew_manager exec board role via user-specific permissions
INSERT INTO public.gw_user_module_permissions (user_id, module_id, is_active, granted_by)
SELECT 
    p.user_id,
    'first-year-console' as module_id,
    true as is_active,
    (SELECT id FROM auth.users LIMIT 1) as granted_by
FROM public.gw_profiles p 
WHERE p.exec_board_role = 'set_up_crew_manager'
ON CONFLICT (user_id, module_id) 
DO UPDATE SET 
    is_active = true,
    updated_at = now();