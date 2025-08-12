-- Add missing role-module permissions for modules that exist in gw_modules but not in gw_role_module_permissions
-- Using the first super admin as the granted_by user for system-generated permissions

-- Get a super admin user ID for the granted_by field
WITH super_admin AS (
  SELECT user_id FROM public.gw_profiles 
  WHERE is_super_admin = true 
  ORDER BY created_at 
  LIMIT 1
)
-- First, let's add basic 'view' permission for 'member' role for all missing modules
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active, granted_by)
SELECT 'member', gm.name, 'view', true, sa.user_id
FROM public.gw_modules gm
CROSS JOIN super_admin sa
WHERE gm.is_active = true 
AND gm.name NOT IN (
  SELECT DISTINCT module_name 
  FROM public.gw_role_module_permissions 
  WHERE role = 'member' AND permission_type = 'view'
)
ON CONFLICT (role, module_name, permission_type) DO NOTHING;

-- Add 'admin' role with 'manage' permissions for all modules
WITH super_admin AS (
  SELECT user_id FROM public.gw_profiles 
  WHERE is_super_admin = true 
  ORDER BY created_at 
  LIMIT 1
)
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active, granted_by)
SELECT 'admin', gm.name, 'manage', true, sa.user_id
FROM public.gw_modules gm
CROSS JOIN super_admin sa
WHERE gm.is_active = true 
AND gm.name NOT IN (
  SELECT DISTINCT module_name 
  FROM public.gw_role_module_permissions 
  WHERE role = 'admin' AND permission_type = 'manage'
)
ON CONFLICT (role, module_name, permission_type) DO NOTHING;

-- Add 'admin' role with 'view' permissions for all modules
WITH super_admin AS (
  SELECT user_id FROM public.gw_profiles 
  WHERE is_super_admin = true 
  ORDER BY created_at 
  LIMIT 1
)
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active, granted_by)
SELECT 'admin', gm.name, 'view', true, sa.user_id
FROM public.gw_modules gm
CROSS JOIN super_admin sa
WHERE gm.is_active = true 
AND gm.name NOT IN (
  SELECT DISTINCT module_name 
  FROM public.gw_role_module_permissions 
  WHERE role = 'admin' AND permission_type = 'view'
)
ON CONFLICT (role, module_name, permission_type) DO NOTHING;