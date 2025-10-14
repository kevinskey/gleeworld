-- Grant jordynoneal@spelman.edu module management permissions
-- This allows her to manage member modules and assign modules in the user modules tab

-- Grant user-management module permission (only if not already granted)
DO $$
DECLARE
  v_user_id uuid;
  v_granter_id uuid;
BEGIN
  -- Get the user ID for jordynoneal@spelman.edu
  SELECT user_id INTO v_user_id
  FROM public.gw_profiles
  WHERE email = 'jordynoneal@spelman.edu'
  LIMIT 1;

  -- Get a super admin to be the granter
  SELECT user_id INTO v_granter_id
  FROM public.gw_profiles
  WHERE is_super_admin = true
  LIMIT 1;

  -- Only proceed if we found the user
  IF v_user_id IS NOT NULL AND v_granter_id IS NOT NULL THEN
    
    -- Grant user-management permission
    IF NOT EXISTS (
      SELECT 1 FROM public.gw_user_module_permissions
      WHERE user_id = v_user_id 
        AND module_id = 'user-management'
        AND is_active = true
    ) THEN
      INSERT INTO public.gw_user_module_permissions (
        user_id, module_id, granted_by, granted_at, is_active, notes
      ) VALUES (
        v_user_id,
        'user-management',
        v_granter_id,
        now(),
        true,
        'Granted permission to manage member modules and assign modules'
      );
    END IF;

    -- Grant permissions module permission
    IF NOT EXISTS (
      SELECT 1 FROM public.gw_user_module_permissions
      WHERE user_id = v_user_id 
        AND module_id = 'permissions'
        AND is_active = true
    ) THEN
      INSERT INTO public.gw_user_module_permissions (
        user_id, module_id, granted_by, granted_at, is_active, notes
      ) VALUES (
        v_user_id,
        'permissions',
        v_granter_id,
        now(),
        true,
        'Granted permission to manage module assignments'
      );
    END IF;

  END IF;
END $$;