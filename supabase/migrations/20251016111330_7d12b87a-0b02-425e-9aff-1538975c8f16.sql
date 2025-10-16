-- Clear all user module permissions for reset
-- This will remove all module access grants for all users except system defaults

-- Clear main module permission tables
TRUNCATE TABLE public.gw_module_permissions CASCADE;
TRUNCATE TABLE public.gw_user_module_permissions CASCADE;
TRUNCATE TABLE public.user_module_permissions CASCADE;
TRUNCATE TABLE public.gw_role_module_permissions CASCADE;
TRUNCATE TABLE public.username_permissions CASCADE;
TRUNCATE TABLE public.username_module_permissions CASCADE;

-- Clear user customization tables (ordering, favorites, etc.)
TRUNCATE TABLE public.gw_module_assignments CASCADE;
TRUNCATE TABLE public.gw_module_favorites CASCADE;
TRUNCATE TABLE public.gw_module_ordering CASCADE;
TRUNCATE TABLE public.gw_user_module_orders CASCADE;
TRUNCATE TABLE public.gw_executive_module_preferences CASCADE;
TRUNCATE TABLE public.user_dashboard_modules CASCADE;

-- Clear permission groups if they exist
TRUNCATE TABLE public.user_permission_groups CASCADE;
TRUNCATE TABLE public.permission_group_permissions CASCADE;

-- Note: gw_modules table is NOT cleared - it contains the module definitions
-- Note: permission_groups table is NOT cleared - it contains the group definitions

-- Log the reset
DO $$
BEGIN
  RAISE NOTICE 'All user module permissions have been cleared successfully';
  RAISE NOTICE 'Module definitions and permission group definitions remain intact';
  RAISE NOTICE 'You can now reassign module permissions to users';
END $$;