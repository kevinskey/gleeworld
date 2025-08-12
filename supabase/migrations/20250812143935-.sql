-- Add missing role-module permissions for modules that exist in gw_modules but not in gw_role_module_permissions
-- This ensures all modules are available for permission assignment

-- First, let's add basic 'view' permission for 'member' role for all missing modules
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active)
SELECT 'member', name, 'view', true
FROM public.gw_modules 
WHERE is_active = true 
AND name NOT IN (
  SELECT DISTINCT module_name 
  FROM public.gw_role_module_permissions 
  WHERE role = 'member' AND permission_type = 'view'
)
ON CONFLICT (role, module_name, permission_type) DO NOTHING;

-- Add 'admin' role with 'manage' permissions for all modules
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active)
SELECT 'admin', name, 'manage', true
FROM public.gw_modules 
WHERE is_active = true 
AND name NOT IN (
  SELECT DISTINCT module_name 
  FROM public.gw_role_module_permissions 
  WHERE role = 'admin' AND permission_type = 'manage'
)
ON CONFLICT (role, module_name, permission_type) DO NOTHING;

-- Add 'admin' role with 'view' permissions for all modules (needed for proper inheritance)
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active)
SELECT 'admin', name, 'view', true
FROM public.gw_modules 
WHERE is_active = true 
AND name NOT IN (
  SELECT DISTINCT module_name 
  FROM public.gw_role_module_permissions 
  WHERE role = 'admin' AND permission_type = 'view'
)
ON CONFLICT (role, module_name, permission_type) DO NOTHING;