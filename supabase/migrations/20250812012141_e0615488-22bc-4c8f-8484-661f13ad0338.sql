-- Fix previous failure by supplying granted_by for role-level permissions
-- Grant Ariana view+manage for Student Conductor, Music Library, and Auditions
-- And grant Exec Board (role 'executive') view+manage for Media Library with a valid granted_by

DO $$
DECLARE
  v_user_id uuid;
  v_granted_by uuid;
BEGIN
  -- Resolve Ariana's user id by email
  SELECT user_id INTO v_user_id
  FROM public.gw_profiles
  WHERE lower(email) = lower('arianaswindell@spelman.edu')
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found for email %', 'arianaswindell@spelman.edu';
  END IF;
  
  -- Upsert user-specific permissions for the three modules (both view and manage)
  INSERT INTO public.gw_module_permissions (user_id, module_id, permission_type, is_active)
  SELECT 
    v_user_id,
    m.id,
    p.permission_type,
    true
  FROM public.gw_modules m
  JOIN (VALUES ('view'), ('manage')) AS p(permission_type) ON TRUE
  WHERE m.is_active = true
    AND m.name IN ('Student Conductor', 'Music Library', 'Auditions')
  ON CONFLICT (user_id, module_id, permission_type)
  DO UPDATE SET is_active = TRUE;
  
  -- Ensure any existing entries are active
  UPDATE public.gw_module_permissions gmp
  SET is_active = true
  WHERE gmp.user_id = v_user_id
    AND gmp.permission_type IN ('view','manage')
    AND gmp.module_id IN (
      SELECT id FROM public.gw_modules 
      WHERE name IN ('Student Conductor', 'Music Library', 'Auditions')
    );
  
  -- Determine a granter for role-based permissions: prefer a super admin, otherwise any admin
  SELECT user_id INTO v_granted_by
  FROM public.gw_profiles
  WHERE is_super_admin = true
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_granted_by IS NULL THEN
    SELECT user_id INTO v_granted_by
    FROM public.gw_profiles
    WHERE is_admin = true OR role IN ('admin','super-admin')
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  IF v_granted_by IS NULL THEN
    RAISE EXCEPTION 'No admin or super admin found to set as granted_by for role permissions';
  END IF;
  
  -- Upsert role-based permission for Exec Board to view+manage Media Library
  INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active, granted_by)
  VALUES 
    ('executive', 'Media Library', 'view', true, v_granted_by),
    ('executive', 'Media Library', 'manage', true, v_granted_by)
  ON CONFLICT (role, module_name, permission_type)
  DO UPDATE SET is_active = EXCLUDED.is_active, granted_by = EXCLUDED.granted_by, updated_at = now();
END$$;