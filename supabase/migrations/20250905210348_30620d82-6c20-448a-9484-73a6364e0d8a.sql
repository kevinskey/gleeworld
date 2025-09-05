-- Grant first-year-console module access to crew manager role
-- First add role-based permissions for crew managers (without conflict clause)
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active, granted_by)
SELECT 'crew-manager', 'first-year-console', 'view', true, 
       (SELECT id FROM auth.users WHERE email LIKE '%spelman.edu' LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM gw_role_module_permissions 
    WHERE role = 'crew-manager' AND module_name = 'first-year-console' AND permission_type = 'view'
);

INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active, granted_by)
SELECT 'crew-manager', 'first-year-console', 'manage', true, 
       (SELECT id FROM auth.users WHERE email LIKE '%spelman.edu' LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM gw_role_module_permissions 
    WHERE role = 'crew-manager' AND module_name = 'first-year-console' AND permission_type = 'manage'
);

-- Grant access to users with set_up_crew_manager exec board role via user-specific permissions
INSERT INTO public.gw_user_module_permissions (user_id, module_id, is_active, granted_by)
SELECT 
    p.user_id,
    'first-year-console' as module_id,
    true as is_active,
    (SELECT id FROM auth.users WHERE email LIKE '%spelman.edu' LIMIT 1) as granted_by
FROM public.gw_profiles p 
WHERE p.exec_board_role = 'set_up_crew_manager'
AND NOT EXISTS (
    SELECT 1 FROM gw_user_module_permissions ump
    WHERE ump.user_id = p.user_id AND ump.module_id = 'first-year-console'
);